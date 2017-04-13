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

function Conference (colleague) {
    this._colleague = colleague
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

Conference.prototype.request = function (envelope, callback) {
    this._colleague._request(envelope, callback)
}

function Colleague (ua, kibitzer) {
    this._ua = ua
    this._kibitzer = kibitzer

    this.read = new Procession
    this.write = new Procession
//    this.read.pump(function (envelope) { console.log('READ', envelope) })
//    this.write.pump(function (envelope) { console.log('WRITE', envelope) })

    this._requester = new Requester('colleague', this.read, this.write)
//    this._requester.read.pump(function (envelope) { console.log('REQUESTER READ', envelope) })
    var responder = new Responder(this, 'colleague', this._requester.read, this._requester.write)
    var server = new Server({ object: this, method: '_connect' }, 'outgoing', responder.read, responder.write)
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
}

Colleague.prototype.pump = function (pumpable) {
    this.write.pump(pumpable.write, 'enqueue')
    pumpable.read.pump(this.read, 'enqueue')
}

Colleague.prototype.log = cadence(function (async, ready) {
    ready = coalesce(ready, new Signal)
    this._destructible.stack(async, 'log')(function (ready) {
        var shifter = this._kibitzer.islander.log.shifter()
        this._destructible.addDestructor('log', shifter, 'destroy')
        ready.unlatch()
        var loop = async(function () {
            shifter.dequeue(async())
        }, function (entry) {
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
    this._destructible.ready.wait(ready, 'unlatch')
})

Colleague.prototype.listen = cadence(function (async, input, output, ready) {
    ready = coalesce(ready, new Signal)
    this._destructible.stack(async, 'conduit')(function (ready) {
        this._conduit = new Conduit(input, output)
        this._destructible.addDestructor('conduit', this._conduit, 'destroy')
        this.pump(this._conduit)
        this.connected.unlatch()
        this._conduit.listen(async())
        this._conduit.ready.wait(ready, 'unlatch')
    })
    this.log(ready, async())
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
    tunnel.read.pump(socket.write)
    socket.read.pump(tunnel.write)
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
    socket.read.pump(tunnel.write)
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
    tunnel.read.pump(socket.write)
    conduit.listen(abend)
})

Colleague.prototype._connect = function (socket, header) {
    this._socket(socket, header, abend)
}

module.exports = Colleague
