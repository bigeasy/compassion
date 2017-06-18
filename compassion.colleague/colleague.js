var delta = require('delta')
var abend = require('abend')
var cadence = require('cadence')
var Destructible = require('destructible')
var stream = require('stream')
var coalesce = require('extant')
var Signal = require('signal')
var Procession = require('procession')
var assert = require('assert')
var Requester = require('conduit/requester')
var Responder = require('conduit/responder')
var Server = require('conduit/server')
var Client = require('conduit/client')
var Conduit = require('conduit')
var http = require('http')
var url = require('url')
var logger = require('prolific.logger').createLogger('compassion.colleague')

function Colleague (ua, kibitzer, server) {
    this._ua = ua
    this._kibitzer = kibitzer

    this.read = new Procession
    this.write = new Procession
//    this.read.pump(function (envelope) { console.log('READ', envelope) })
//    this.write.pump(function (envelope) { console.log('WRITE', envelope) })

    this._requester = new Requester('colleague', this.read, this.write)
//    this._requester.read.pump(function (envelope) { console.log('REQUESTER READ', envelope) })
    var responder = new Responder(this, 'colleague', this._requester.read, this._requester.write)
    var server = new Server(server || { object: this, method: '_connect' }, 'outgoing', responder.read, responder.write)
    this._client = new Client('incoming', server.read, server.write)

    this._write = this._client.write

    server.read.pump(this, '_read')

    this.connected = new Signal

    this.chatter = new Procession
    this.responses = new Procession

    this.responses.pump(this, '_response')

    this._destructible = new Destructible
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('connected', this.connected, 'unlatch')

    this.demolition = this._destructible.events
    this.done = this._destructible.done

    this.ready = new Signal
}

Colleague.prototype._read = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this.chatter.push(envelope)
    switch (envelope.method) {
    case 'boundary':
    case 'record':
    case 'replay':
        // For these cases, it was enough to record them.
        break
    case 'response':
        this.responses.push(response)
        break
    case 'naturalized':
        this._kibitzer.naturalize()
        break
    case 'broadcast':
    case 'reduce':
        this._kibitzer.publish(envelope)
        break
    }
})

Colleague.prototype._log = cadence(function (async) {
    var shifter = this._kibitzer.islander.log.shifter()
    this._destructible.addDestructor('log', shifter, 'destroy')
    var loop = async(function () {
        shifter.dequeue(async())
        this.ready.unlatch()
    }, function (entry) {
        console.log('ENTRY', entry)
        async(function () {
            this._write.enqueue(entry && {
                module: 'colleague',
                method: 'entry',
                body: entry
            }, async())
        }, function () {
            if (entry == null) {
                return [ loop.break ]
            }
        })
    })()
})

Colleague.prototype.listen = cadence(function (async) {
    this._log(this._destructible.monitor('log'))
    this._destructible.complete(1000, async())
})

Colleague.prototype.request = cadence(function (async, envelope) {
    var properties = this._kibitzer.paxos.government.properties[envelope.to]
    async(function () {
        this._ua.fetch({
            url: properties.url
        }, {
            url: './oob',
            post: envelope,
            raise: true
        }, async())
    }, function (body) {
        return [ body ]
    })
})

Colleague.prototype.destroy = function () {
    this._destructible.destroy()
}

Colleague.prototype.getProperties = cadence(function (async) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: {
                id: this._kibitzer.paxos.id,
                replaying: false
            }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

Colleague.prototype.outOfBand = cadence(function (async, request) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: request.method,
            from: coalesce(request.from),
            body: request.body
        }, async())
    }, function (response) {
        return [ response ]
    })
})

Colleague.prototype._tunnel = function (tunnel, header) {
    var socket = this._client.connect(header.body)
    tunnel.read.pump(socket.write, 'enqueue')
    socket.read.pump(tunnel.write, 'enqueue')
}

Colleague.prototype._socket = cadence(function (async, socket, header) {
    var location = url.parse(url.resolve(header.to.url, 'socket'))
    var through = new stream.PassThrough
    var request = http.request({
        host: location.hostname,
        port: +coalesce(location.port, 80),
        method: 'POST',
        path: location.pathname,
        timeout: 5000
    })
    async(function () {
        delta(async()).ee(request).on('response')
    }, function (response) {
        response.pipe(through)
    })
    var conduit = new Conduit(through, request)
    var client = new Client('tunnel', conduit.read, conduit.write)
    var tunnel = client.connect({
        module: 'compassion',
        method: 'tunnel',
        body: header.body
    })
    tunnel.read.pump(function (envelope) {
        if (envelope == null) {
            conduit.destroy()
        }
    })
    socket.read.pump(tunnel.write, 'enqueue')
    tunnel.wrote.pump(function (envelope) {
        if (envelope == null) {
            setImmediate(function () { request.end() })
            return
            conduit.write.push(null)
        }
    })
    conduit.wrote.pump(function (envelope) {
        if (envelope == null) {
            request.end()
        }
    })
    tunnel.read.pump(socket.write, 'enqueue')
    conduit.listen(abend)
})

Colleague.prototype._connect = function (socket, header) {
    this._socket(socket, header, abend)
}

module.exports = Colleague
