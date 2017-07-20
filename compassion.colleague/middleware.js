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
// band messages to the given Conduit `Requester`.

//
function Middleware (startedAt, island, kibitzer, colleague) {
    this.reactor  = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /oob', 'outOfBand')
        dispatcher.dispatch('POST /socket', 'socket')
        dispatcher.dispatch('POST /kibitz', 'kibitz')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /request', 'request')
        dispatcher.dispatch('GET /health', 'health')
    })
    this._startedAt = startedAt
    this._island = island
    this._kibitzer = kibitzer
    this._colleague = colleague
}

// Return an index message.

//
Middleware.prototype.index = cadence(function (async) {
    return 'Compassion Colleague API\n'
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
    return [ function (response) {
        console.log('EXAMPLE')
        this._request(request, response, abend)
    }.bind(this), { 'content-type': 'application/json-stream' } ]
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
        promise: this._kibitzer.paxos.government.promise,
        republic: coalesce(this._kibitzer.paxos.republic),
        government: this._kibitzer.paxos.government
    }
})

// Export as constructor.
module.exports = Middleware
