var cadence = require('cadence')
var events = require('events')
var Kibitzer = require('kibitz')
var url = require('url')
var abend = require('abend')
var Reactor = require('reactor')
var WebSocket = require('ws')
var logger = require('prolific.logger').createLogger('bigeasy.compassion.colleague.http')
var assert = require('assert')

function Colleague (options) {
    this.kibitzer = null
    this._reinstatementId = 0
    this._requests = new Reactor({ object: this, method: '_request' })
    this._requests.turnstile.health.turnstiles = 24
    this.messages = new events.EventEmitter
    this.colleagueId = options.colleagueId
    this.islandName = options.islandName
    this._timeout = options.timeout
    this._ping = options.ping
    this._recording = null
    this.start = Date.now()
    this.properties = options.properties
    this.ua = options.ua
}

Colleague.prototype.shutdown = function () {
    if (this.kibitzer != null) {
        this.kibitzer.terminate()
        this.kibitzer = null
    }
}

Colleague.prototype.replay = function (entry) {
    this._recording = []
}

// TODO Break this up somehow, really crufty.
Colleague.prototype.play = function (entry) {
    if (entry.qualifier == 'bigeasy.compassion.colleague.http' && entry.level == 'trace') {
        switch (entry.name) {
        case 'bootstrap':
            logger.trace('bootstrap', { request: entry.request, cookie: entry.cookie })
            this._createKibitzer(entry.request, entry.cookie, true, true)
            this.kibitzer.replay()
            break
        case 'join':
            logger.trace('join', { request: entry.request, cookie: entry.cookie })
            this._createKibitzer(entry.request, entry.cookie, true, false)
            this.kibitzer.replay()
            break
        case 'publish':
            break
            try {
                assert.deepEqual(this._recording[0], {
                    reinstatementId: entry.reinstatementId,
                    entry: entry.entry
                })
                this._recording.shift()
            } catch (e) {
                console.log('r', this._recording[0] && this._recording[0].entry)
                console.log('l', entry.entry)
            }
            break
        }
    } else if (this.kibitzer != null) {
        this.kibitzer.play(entry)
    }
    this.messages.emit('replay', entry)
    return this
}

Colleague.prototype._createKibitzer = function (body, cookie, timerless, bootstrap) {
    this.shutdown()
    this.messages.emit('message', {
        type: 'reinstate',
        bootstrap: bootstrap,
        reinstatementId: ++this._reinstatementId,
        islandId: body.islandId,
        colleagueId: this.colleagueId
    })
    this.kibitzer = new Kibitzer(body.islandId, this.colleagueId, {
        ua: this.ua,
        cookie: cookie,
        properties: body.properties,
        timeout: this._timeout,
        ping: this._ping,
        timerless: timerless
    })
    this.kibitzer.legislator.naturalized = bootstrap
    this.kibitzer.log.on('entry', this._onEntry.bind(this))
}

Colleague.prototype.bootstrap = cadence(function (async, request) {
    logger.trace('bootstrap', { request: request, cookie: this.start })
    this._createKibitzer(request, this.start, false, true)
    this.kibitzer.bootstrap(abend)
    return {}
})

Colleague.prototype.join = cadence(function (async, request) {
    logger.trace('join', { request: request, cookie: this.start })
    this._createKibitzer(request, this.start, false, false)
    this.kibitzer.join(request.liaison, abend)
    return {}
})

Colleague.prototype._onEntry = function (entry) {
    this.messages.emit('message', { type: 'entry', entry: entry })
}

Colleague.prototype.kibitz = cadence(function (async, request) {
    if (this.kibitzer == null) {
        return [ null ]
    }
    this.kibitzer.dispatch(request.kibitz, async())
})

Colleague.prototype.publish = cadence(function (async, reinstatementId, entry) {
    logger.trace('publish', { reinstatementId: reinstatementId, entry: entry })
    if (reinstatementId != this._reinstatementId) {
        return null
    }
    if (this.kibitzer == null) {
        return null
    }
    if (this._recording == null) {
        this.kibitzer.publish(entry)
    } else {
        this._recording.push({ reinstatementId: reinstatementId, entry: entry })
    }
    return []
})

Colleague.prototype.naturalized = function () {
    this.kibitzer.legislator.naturalized = true
}

Colleague.prototype.health = cadence(function (async) {
    var islandId = null, government = null
    if (this.kibitzer != null) {
        islandId = this.kibitzer.legislator.islandId
        government = this.kibitzer.legislator.government
    }
    return {
        uptime: Date.now() - this.start,
        requests: this._requests.turnstile.health,
        islandName: this.islandName,
        colleagueId: this.colleagueId,
        islandId: islandId,
        government: government
    }
})

Colleague.prototype.request = cadence(function (async, type, body) {
    if (!~([ 'health', 'kibitz', 'join', 'bootstrap', 'shutdown' ]).indexOf(type)) {
        return [ { cookie: request.cookie, body: null } ]
    }
    this[type](body, async())
})

module.exports = Colleague
