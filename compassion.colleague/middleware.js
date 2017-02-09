// Control-flow utilities.
var cadence = require('cadence')

// Sencha Connect middleware builder.
var Dispatcher = require('inlet/dispatcher')

// Event wrapper around our consensus algorithm.
var Kibitzer = require('kibitz')

// Construct an http responder for the given `Kibitzer` that forwards out of
// band messages to the given Conduit `Requester`.

//
function Middleware (startedAt, islandName, kibitzer, requester) {
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('POST /oob', 'outOfBand')
    dispatcher.dispatch('POST /kibitz', 'kibitz')
    dispatcher.dispatch('GET /health', 'health')
    this.dispatcher = dispatcher
    this._startedAt = startedAt
    this._islandName = islandName
    this._kibitzer = kibitzer
    this._requester = requester
}

// Return an index message.

//
Middleware.prototype.index = cadence(function (async) {
    return 'Compassion Colleague API\n'
})

// Forward out of band requests to our Conduit `Requester`.

//
Middleware.prototype.oob = cadence(function (async, request) {
    this._requester.request('outOfBand', request.body, async())
})

// Pass Kibitz envelopes to our `Kibitzer`.

//
Middleware.prototype.kibitz = cadence(function (async, request) {
    this._kibitzer.request(request.body, async())
})

// Report on the health and provide general info for bootstrap discovery.

//
Middleware.prototype.health = cadence(function (async) {
    return {
        dispatcher: this.dispatcher.turnstile.health,
        startedAt: this._startedAt,
        islandName: this._islandName,
        id: this._kibitzer.paxos.id,
        islandId: this._kibitzer.paxos.islandId,
        government: this._kibitzer.paxos.government
    }
})

// Export as constructor.
module.exports = Middleware
