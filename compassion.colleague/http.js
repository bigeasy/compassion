var cadence = require('cadence')
var events = require('events')
var Delta = require('delta')
var Kibitzer = require('kibitz')
var abend = require('abend')
var Reactor = require('reactor')
var WebSocket = require('ws')
var logger = require('prolific.logger').createLogger('bigeasy.compassion.colleague.actor')

function Colleague (options) {
    this.kibitzer = null
    this._reinstatementId = 0
    this._requests = new Reactor({ object: this, method: '_request' })
    this._requests.turnstile.health.turnstiles = 24
    this.messages = new events.EventEmitter
    this._colleagueId = options.colleagueId
    this._islandName = options.islandName
    this.start = Date.now()
    this.properties = options.properties
    this.ua = options.ua
    this.delegate = new (options.Delegate)(this)
}

Colleague.prototype.shutdown = function () {
    if (this.kibitzer != null) {
        this.kibitzer.terminate()
        this.kibitzer = null
    }
}

Colleague.prototype.bootstrap = cadence(function (async, request) {
    var body = request.body
    this.shutdown()
    this.messages.emit('message', {
        type: 'reinstate',
        bootstrap: true,
        reinstatementId: ++this._reinstatementId,
        islandId: body.islandId,
        colleagueId: this._colleagueId
    })
    this.kibitzer = new Kibitzer(body.islandId, this._colleagueId, {
        ua: this.ua,
        properties: body.properties
    })
    this.kibitzer.log.on('entry', this._onEntry.bind(this))
    this.kibitzer.bootstrap(abend)
    return {}
})

Colleague.prototype.join = cadence(function (async, request) {
    var body = request.body
    this.shutdown()
    this.messages.emit('message', {
        type: 'reinstate',
        bootstrap: false,
        reinstatementId: ++this._reinstatementId,
        islandId: body.islandId,
        colleagueId: this._colleagueId
    })
    if (!body.properties) {
        console.log(body)
        throw new Error
    }
    this.kibitzer = new Kibitzer(body.islandId, this._colleagueId, {
        ua: this.ua,
        properties: body.properties
    })
    this.kibitzer.log.on('entry', this._onEntry.bind(this))
    this.kibitzer.join(body.liaison, abend)
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
    return {}
})

// TODO Return a unique null cookie? Do cookies need to be ordered?
Colleague.prototype.publish = function (reinstatementId, entry) {
    if (reinstatementId != this._reinstatementId) {
        return null
    }
    if (this.kibitzer == null) {
        return null
    }
    this.kibitzer.publish(entry)
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
        islandId: islandId,
        legislatorId: this._colleagueId,
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
        return null
    })
})

Colleague.prototype.listen = cadence(function (async, address, argv) {
    async(function () {
        this.delegate.initialize(argv, async())
    }, function () {
        var url = 'ws://' + address + '/' + this._islandName + '/' + this._colleagueId
        var loop = async(function () {
            if (this._shutdown) {
                return [ loop.break ]
            }
            this._ws = new WebSocket(url)
            async([function () {
                async(function () {
                    new Delta(async()).ee(this._ws).on('open')
                }, function () {
                    new Delta(async()).ee(this._ws)
                        .on('message', this.request.bind(this))
                        .on('close')
                })
            }, function (error) {
                logger.error('connect', { message: error.message })
                return [ loop.continue ]
            }])
        })()
    })
})

Colleague.prototype.stop = function () {
    setTimeout(function () { throw new Error }, 3000).unref()
    if (!this._shutdown) {
        this.shutdown()
        this._shutdown = true
        this.delegate.stop()
        if (this._ws != null) {
            this._ws.close()
        }
    }
}

module.exports = Colleague
