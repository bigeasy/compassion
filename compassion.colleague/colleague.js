var abend = require('abend')
var rescue = require('rescue')
var cadence = require('cadence')
var delta = require('delta')

var Thereafter = require('thereafter')
var Destructible = require('destructible')

var coalesce = require('extant')

var Signal = require('signal')

var Conduit = require('conduit')
var Procession = require('procession')

var Requester = require('conduit/requester')
var Responder = require('conduit/responder')

var Server = require('conduit/server')
var Client = require('conduit/client')

var Multiplexer = require('conduit/multiplexer')

var Envoy = require('assignation/envoy')
var Middleware = require('./middleware')

var UserAgent = require('./ua')
var Vizsla = require('vizsla')

var Timer = require('happenstance').Timer

var http = require('http')

function Colleague (ua, kibitzer, server, island) {
    this._ua = ua

    this._Date = Date

    this.kibitzer = kibitzer

    var responder = new Responder(new UserAgent(new Vizsla))

    kibitzer.paxos.scheduler.events.shifter().pump(new Timer(kibitzer.paxos.scheduler), 'enqueue')
    kibitzer.read.shifter().pump(responder.write, 'enqueue')
    responder.read.shifter().pump(kibitzer.write, 'enqueue')

    this._multiplexer = new Multiplexer

    this.read = this._multiplexer.read
    this.write = this._multiplexer.write

    this._multiplexer.route('conference', this._requester = new Requester)
    this._multiplexer.route('colleague', new Responder(this))

    this._multiplexer.route('outgoing', server ? new Server(server) : new Server(this, '_connect'))
    this._multiplexer.route('incoming', this._client = new Client)

    this._write = this.read

    this.write.shifter().pump(this, '_read')

    this.chatter = new Procession
    this.responses = new Procession

    this.responses.shifter().pump(this, '_response')

    this._destructible = new Destructible('colleague')
    this._destructible.markDestroyed(this)

    this._thereafter = new Thereafter
    this._destructible.addDestructor('thereafter', this._thereafter, 'cancel')

    this.connected = new Signal

    this._destructible.addDestructor('connected', this.connected, 'unlatch')

    this.demolition = this._destructible.events
    this.done = this._destructible.done

    var middleware = new Middleware(Date.now(), island, this.kibitzer, this)
    this._envoy = new Envoy(middleware.reactor.middleware)

    this.ready = new Signal
}

Colleague.prototype._startEnvoy = cadence(function (async, ready, host, port) {
    var id = this.kibitzer.paxos.id
    async(function () {
        var request = http.request({
            host: host,
            port: port,
            headers: Envoy.headers('/' + id, { host: host + ':' + port })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        this._destructible.addDestructor('envoy', this._envoy, 'close')
        this._envoy.ready.wait(ready, 'unlatch')
        this._envoy.connect(request, socket, head, async())
    })
})

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
        this.kibitzer.naturalize()
        break
    case 'broadcast':
    case 'reduce':
        this.kibitzer.publish(envelope)
        break
    }
})

// TODO Why isn't this simply a pipe?
Colleague.prototype._log = cadence(function (async) {
    var shifter = this.kibitzer.islander.log.shifter()
    this._destructible.addDestructor('log', shifter, 'destroy')
    var loop = async(function () {
        shifter.dequeue(async())
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

Colleague.prototype.listen = cadence(function (async, host, port) {
    this._thereafter.run(this, function (ready) {
        this._startEnvoy(ready, host, port, this._destructible.monitor('envoy'))
    })
    this._thereafter.run(this, function (ready) {
        this._destructible.addDestructor('kibitzer', this.kibitzer, 'destroy')
        this.kibitzer.ready.wait(ready, 'unlatch')
        this.kibitzer.listen(this._destructible.monitor('kibitzer'))
    })
    this._thereafter.run(this, function (ready) {
        this._log(this._destructible.monitor('log'))
        ready.unlatch()
    })
    this._thereafter.run(this, function (ready) {
        this.shifter = this.kibitzer.log.shifter()
        ready.unlatch()
    })
    this._thereafter.ready.wait(this.ready, 'unlatch')
    this._destructible.completed(5000, async())
})

Colleague.prototype.request = cadence(function (async, envelope) {
    var properties = this.kibitzer.paxos.government.properties[envelope.to]
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
                id: this.kibitzer.paxos.id,
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

Colleague.prototype.bootstrap = cadence(function (async) {
    async(function () {
        this.getProperties(async())
    }, function (properties) {
        properties.url = 'http://127.0.0.1:8888/' + this.kibitzer.paxos.id + '/'
        this.kibitzer.bootstrap(this._Date.now(), properties)
    })
})

module.exports = Colleague
