// Common utilities.
var coalesce = require('extant')
var assert = require('assert')

// Control-flow utilities.
var cadence = require('cadence')
var abend = null // require('abend')

// Sencha Connect middleware builder.
var Reactor = require('reactor')

// Event wrapper around our consensus algorithm.
var Kibitzer = require('kibitz')

var Conduit = require('conduit')
var Server = require('conduit/server')

var logger = require('prolific.logger').createLogger('compassion.colleague')

// Construct an http responder for the given `Kibitzer` that forwards out of
// band messages to the given Conduit `Caller`.

//
function Middleware (startedAt, island, kibitzer, colleague) {
    this.reactor  = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /kibitz', 'kibitz')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /request', 'request')
        dispatcher.dispatch('POST /bootstrap', 'bootstrap')
        dispatcher.dispatch('GET /health', 'health')
        dispatcher.dispatch('GET /recoverable', 'recoverable')
    })
    this._joined = false
    this._startedAt = startedAt
    this._island = island
    this._kibitzer = kibitzer
    this._colleague = colleague
    this._decided = false
}

// Return an index message.

//
Middleware.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Colleague API\n' ]
})

Middleware.prototype._alreadyDecided = function () {
    if (this._decided) {
        throw 401
    }
}

Middleware.prototype.bootstrap = cadence(function (async, request) {
    this._alreadyDecided()
    this._decided = true
    async(function () {
        this._colleague.bootstrap(request.body.republic, request.body.url.self, async())
    }, function () {
        return 200
    })
})

Middleware.prototype.backlog = cadence(function (async, request) {
    this._colleague.backlog(request.body, async())
})

Middleware.prototype._request = cadence(function (async, request, response) {
    async(function () {
        this._colleague.newOutOfBand(request.body, async())
    }, function (queue) {
        var loop = async(function () {
            queue.dequeue(async())
        }, function (entry) {
            if (entry == null) {
                response.end()
                return [ loop.break ]
            }
            response.write(JSON.stringify(entry) + '\n')
        })()
    })
})

var abend = require('abend')
Middleware.prototype.request = cadence(function (async, request) {
    return [ 200, { 'content-type': 'application/json-stream' }, function (response) {
        this._request(request, response, abend)
    }.bind(this) ]
})

// Pass Kibitz envelopes to our `Kibitzer`.

//
Middleware.prototype.kibitz = cadence(function (async, request) {
    logger.info('recorded', { source: 'middleware', method: request.body.method, url: request.url, $body: request.body })
    this._kibitzer.request(request.body, async())
})

// Report on the health and provide general info for bootstrap discovery.

//
Middleware.prototype.health = cadence(function (async) {
    return {
        dispatcher: this.reactor.turnstile.health,
        startedAt: this._startedAt,
        island: this._island,
        id: this._kibitzer.paxos.id,
        republic: coalesce(this._kibitzer.paxos.republic),
        government: this._kibitzer.paxos.government
    }
})

// Export as constructor.
module.exports = Middleware
