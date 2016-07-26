var cadence = require('cadence')
var events = require('events')
var Delta = require('delta')
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
            logger.trace('bootstrap', { body: entry.body, cookie: entry.cookie })
            this._createKibitzer(entry.body, entry.cookie, true, true)
            this.kibitzer.replay()
            break
        case 'join':
            logger.trace('join', { body: entry.body, cookie: entry.cookie })
            this._createKibitzer(entry.body, entry.cookie, true, false)
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
    logger.trace('bootstrap', { body: request.body, cookie: this.start })
    this._createKibitzer(request.body, this.start, false, true)
    this.kibitzer.bootstrap(abend)
    return {}
})

Colleague.prototype.join = cadence(function (async, request) {
    logger.trace('join', { body: request.body, cookie: this.start })
    this._createKibitzer(request.body, this.start, false, false)
    this.kibitzer.join(request.body.liaison, abend)
    return {}
})

Colleague.prototype._onEntry = function (entry) {
    this.messages.emit('message', { type: 'entry', entry: entry })
}

Colleague.prototype.kibitz = cadence(function (async, request) {
    if (this.kibitzer == null) {
        return [ null ]
    }
    this.kibitzer.dispatch(request.body.kibitz, async())
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
        logger.trace('bargle')
        this.kibitzer.publish(entry)
    } else {
        logger.trace('argle', { recording: this._recording })
        this._recording.push({ reinstatementId: reinstatementId, entry: entry })
    }
    return []
})

Colleague.prototype.naturalized = function () {
    this.kibitzer.legislator.naturalized = true
}

Colleague.prototype.health = cadence(function (async, request) {
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

Colleague.prototype.request = function (message) {
    this._requests.push(JSON.parse(message))
}

Colleague.prototype._request = cadence(function (async, timeout, request) {
    if (!~([ 'health', 'kibitz', 'join', 'bootstrap', 'shutdown' ]).indexOf(request.type)) {
        return [ { cookie: request.cookie, body: null } ]
    }
    async(function () {
        this[request.type](request, async())
    }, function (body) {
        this._ws.send(JSON.stringify({ cookie: request.cookie, body: body }))
        return []
    })
})

Colleague.prototype.listen = cadence(function (async, address, program) {
    var parsed = {
        protocol: 'ws:',
        slashes: true,
        host: address,
        pathname: '/' + this.islandName + '/' + this.colleagueId
    }
    this._ws = new WebSocket(url.format(parsed))
    async([function () {
        this.stop()
    }], function () {
        new Delta(async()).ee(this._ws).on('open')
    }, function () {
        new Delta(async()).ee(this._ws)
            .on('message', this.request.bind(this))
            .on('close')
    })
})

Colleague.prototype.stop = function () {
    setTimeout(function () { throw new Error }, 250).unref()
    if (!this._shutdown) {
        this.shutdown()
        this._shutdown = true
        if (this._ws != null) {
            this._ws.close()
        }
    }
}

module.exports = Colleague
