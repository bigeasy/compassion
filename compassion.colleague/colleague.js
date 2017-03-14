var delta = require('delta')
var abend = require('abend')
var cadence = require('cadence')
var Destructor = require('destructible')
var coalesce = require('nascent.coalesce')
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

function Conference (colleague) {
    this._colleague = colleague
}

Colleague.prototype.enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this.chatter.push(envelope)
    switch (envelope.method) {
    case 'boundary':
    case 'record':
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

Conference.prototype.fromSpigot = cadence(function (async, envelope) {
    assert(envelope == null)
})

Conference.prototype.request = function (envelope, callback) {
    this._colleague._request(envelope, callback)
}


function Colleague (ua, kibitzer) {
    this._ua = ua
    this._kibitzer = kibitzer

    this.read = new Procession
    this.write = new Procession

    this._requester = new Requester('colleague', this.read, this.write)
    var responder = new Responder(this, 'colleague', this._requester.read, this._requester.write)
    var server = new Server({ object: this, method: '_connect' }, 'outgoing', responder.read, responder.write)
    this._client = new Client('incoming', server.read, server.write)

    this._write = this._client.write

    server.read.pump(this)

    this.connected = new Signal

    this.chatter = new Procession
    this.responses = new Procession

    this.responses.pump({ object: this, method: '_response' })

    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._destructor.addDestructor('connected', { object: this.connected, method: 'unlatch' })

    this.demolition = this._destructor.events
}

Colleague.prototype.listen = cadence(function (async, input, output) {
    this._destructor.async(async, 'conduit')(function () {
        this._conduit = new Conduit(input, output)
        this._destructor.addDestructor('multiplexer', this._conduit.destroy.bind(this._conduit))
        this.write.pump(this._conduit.write)
        this._conduit.read.pump(this.read)
        this.connected.unlatch()
        this._conduit.listen(async())
    })
    this._destructor.async(async, 'log')(function () {
        var shifter = this._kibitzer.islander.log.shifter()
        this._destructor.addDestructor('log', shifter.destroy.bind(shifter))
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
})

Colleague.prototype._request = cadence(function (async, envelope) {
    var properties = this._kibitzer.paxos.government.properties[envelope.to]
    async(function () {
        this._ua.fetch({
            url: properties.url
        }, {
            url: './oob',
            post: envelope,
            nullify: true
        }, async())
    }, function (body) {
        return [ body ]
    })
})

Colleague.prototype.destroy = function () {
    this._destructor.destroy()
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

var stream = require('stream')
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
    tunnel.read.pump(socket.write)
    socket.read.pump(function (envelope) {
        if (envelope == null) {
            request.end()
        }
    })
    conduit.listen(abend)
})

Colleague.prototype._connect = function (socket, header) {
    this._socket(socket, header, abend)
}

module.exports = Colleague
