var cadence = require('cadence')
var Dispatcher = require('inlet/dispatcher')
var events = require('events')
var Kibitzer = require('kibitz')
var abend = require('abend')

function Compassion (options) {
    this.kibitzer = null
    this.messages = new events.EventEmitter
    this.id = options.id
    this.start = Date.now()
    this.location = options.location
    this.ua = options.ua
// TODO Here's a reason to extract the argument parser from arguable.
    this.delegate = new (options.Delegate)(this, options.argv)
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('GET /health', 'health')
    this.dispatcher = dispatcher
}

Compassion.prototype.index = cadence(function () {
    return 'Compassion API'
})

Compassion.prototype.shutdown = function () {
    if (this.kibitzer != null) {
        this.kibitzer.terminate()
        this.kibitzer = null
    }
}

Compassion.prototype.bootstrap = cadence(function (async, request) {
    var body = request.body
    this.shutdown()
    this.messages.emit('message', 'reinstate', { bootstrap: true })
    this.kibitzer = new Kibitzer(body.islandId, this.id, {
        ua: this.ua,
        location: body.location
    })
    this.kibitzer.log.on('entry', this._onEntry.bind(this))
    this.kibitzer.bootstrap(abend)
    return {}
})

Compassion.prototype.join = cadence(function (async, request) {
    var body = request.body
    this.shutdown()
    this.messages.emit('message', 'reinstate', { bootstrap: false })
    this.kibitzer = new Kibitzer(body.islandId, this.id, {
        ua: this.ua,
        location: body.location
    })
    this.kibitzer.log.on('entry', this._onEntry.bind(this))
    this.kibitzer.join(body.liaison, abend)
    return {}
})

Compassion.prototype._onEntry = function (entry) {
    this.messages.emit('message', 'entry', entry)
}

Compassion.prototype.kibitz = cadence(function (async, request) {
    if (this.kibitzer == null) {
        request.raise(503)
    }
    this.kibitzer.dispatch(request.body, async())
})

// TODO Return a unique null cookie? Do cookies need to be ordered?
Compassion.prototype.publish = function (entry) {
    if (this.kibitzer == null) {
        return null
    }
    this.kibitzer.publish(entry)
}

Compassion.prototype.health = cadence(function () {
    var islandId = null, government = null
    if (this.kibitzer != null) {
        islandId = this.kibitzer.legislator.islandId
        government = this.kibitzer.legislator.government
    }
    return {
        uptime: Date.now() - this.start,
        http: this.dispatcher.turnstile.health,
        islandId: islandId,
        instanceId: this.id,
        legislatorId: this.id,
        government: government
    }
})

module.exports = Compassion
