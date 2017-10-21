var abend = require('abend')
var rescue = require('rescue')
var cadence = require('cadence')
var delta = require('delta')

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

var finalist = require('finalist')

function Colleague (ua, kibitzer, island) {
    this._ua = ua

    this._Date = Date

    this.kibitzer = kibitzer

    var responder = new Responder(new UserAgent(new Vizsla))

    kibitzer.paxos.scheduler.events.shifter().pump(new Timer(kibitzer.paxos.scheduler), 'enqueue')
    kibitzer.read.shifter().pump(responder.write, 'enqueue')
    responder.read.shifter().pump(kibitzer.write, 'enqueue')

    // TODO Not `this._`.
    this._multiplexer = new Multiplexer({
        conference: this._requester = new Requester,
        incoming: this._client = new Client
    })

    this.read = this._multiplexer.read
    this.write = this._multiplexer.write

    this._write = this.read

    this.write.shifter().pump(this, '_read')

    this.chatter = new Procession

    this._destructible = new Destructible(1000, 'colleague')
    this._destructible.markDestroyed(this)

    this.connected = new Signal

    this._destructible.addDestructor('connected', this.connected, 'unlatch')

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
    if (envelope == null || envelope.module == 'conduit/multiplexer') {
        return
    }
    this.chatter.push(envelope)
    // TODO Create a Conduit for simply streaming.
    switch (envelope.method) {
    case 'boundary':
    case 'record':
    case 'replay':
        // For these cases, it was enough to record them.
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

Colleague.prototype.listen = cadence(function (async, host, port) {
    this._destructible.completed.wait(async())
    async([function () {
        this._destructible.destroy()
    }], function () {
        var ready = new Signal
        this._startEnvoy(ready, host, port, this._destructible.monitor('envoy'))
        // Remove the import of finalist, or otherwise add an exception here,
        // and then we hang the Destructible. We hang because we are waiting on
        // an HTTP get. We should add a destructor somewhere.
        finalist(this, function (callback) {
            this._destructible.completed.wait(callback)
            ready.wait(callback)
        }, async())
    }, function () {
        this._destructible.addDestructor('kibitzer', this.kibitzer, 'destroy')
        this.kibitzer.listen(this._destructible.monitor('kibitzer'))
        finalist(this, function (callback) {
            this._destructible.completed.wait(callback)
            this.kibitzer.ready.wait(callback)
        }, async())
    }, function () {
        this._log(this._destructible.monitor('log'))
        this.shifter = this.kibitzer.log.shifter()
        this.ready.unlatch()
    }, function () {
        this._destructible.completed.wait(async())
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

Colleague.prototype.bootstrap = cadence(function (async, republic, url) {
    require('assert')(republic != null)
    async(function () {
        this.getProperties(async())
    }, function (properties) {
        console.log('!!!', properties)
        properties.url = url
        this.kibitzer.bootstrap(republic, properties)
    })
})

// TODO Using Abend! instead of Destructible.
Colleague.prototype.join = cadence(function (async, republic, leader, url) {
    async(function () {
        this.getProperties(async())
    }, function (properties) {
        properties.url = url
        this.kibitzer.join(republic, { url: leader }, properties, require('abend'))
    })
})

module.exports = Colleague
