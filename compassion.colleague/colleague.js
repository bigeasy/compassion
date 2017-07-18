var delta = require('delta')
var abend = require('abend')
var rescue = require('rescue')
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
var Multiplexer = require('conduit/multiplexer')
var http = require('http')
var url = require('url')
var logger = require('prolific.logger').createLogger('compassion.colleague')
var assert = require('assert')

function Colleague (ua, kibitzer, server) {
    this._ua = ua
    this._kibitzer = kibitzer

    this._multiplexer = new Multiplexer

    this.read = this._multiplexer.read
    this.write = this._multiplexer.write

    this._multiplexer.route('conference', this._requester = new Requester)
    this._multiplexer.route('colleague', new Responder(this))

    this._multiplexer.route('outgoing', server ? new Server(server) : new Server(this, '_connect'))
    this._multiplexer.route('incoming', this._client = new Client)

    this._write = this.read

    this.write.shifter().pump(this, '_read')

    this.connected = new Signal

    this.chatter = new Procession
    this.responses = new Procession

    this.responses.shifter().pump(this, '_response')

    this._destructible = new Destructible('colleague')
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
        async([function () {
            this._write.enqueue(entry && {
                module: 'colleague',
                method: 'entry',
                body: entry
            }, async())
        }, function (error) {
            console.log(error.cause.code)
            rescue(/^code:EPIPE$/, function (error) {
                console.log('hello')
            })(coalesce(error.cause, error))
            console.log('passed')
        }], function () {
            if (entry == null) {
                return [ loop.break ]
            }
        })
    })()
})

Colleague.prototype.listen = cadence(function (async) {
    this._log(this._destructible.monitor('log'))
    this._destructible.completed(5000, async())
})

Colleague.prototype.request = cadence(function (async, envelope) {
    var properties = this._kibitzer.paxos.government.properties[envelope.to]
    console.log('>', envelope)
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

Colleague.prototype.backlog = cadence(function (async, body) {
    this._requester.request({ module: 'colleague', method: 'backlog', body: body }, async())
})

Colleague.prototype.newOutOfBand = cadence(function (async, header) {
    var socket = { read: new Procession, write: new Procession }
    this._client.connect(header, socket)
    socket.read.push(null)
    return [ socket.write.shifter() ]
})

Colleague.prototype.getProperties = cadence(function (async) {
    console.log('GETTING PROPERTIES')
    async(function () {
        this._requester.request({
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

Colleague.prototype._connect = function (socket, header) {
    this._socket(socket, header, abend)
}

module.exports = Colleague
