// Common utilities.
var coalesce = require('nascent.coalesce')

// Control-flow utilities.
var cadence = require('cadence')

// Sencha Connect middleware builder.
var Dispatcher = require('inlet/dispatcher')

// Event wrapper around our consensus algorithm.
var Kibitzer = require('kibitz')

// Construct an http responder for the given `Kibitzer` that forwards out of
// band messages to the given Conduit `Requester`.

//
function Middleware (startedAt, island, kibitzer, colleague) {
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('POST /oob', 'outOfBand')
    dispatcher.dispatch('POST /socket', 'socket')
    dispatcher.dispatch('POST /kibitz', 'kibitz')
    dispatcher.dispatch('GET /health', 'health')
    this.dispatcher = dispatcher
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

// Forward out of band requests to our Conduit `Requester`.

//
Middleware.prototype.outOfBand = cadence(function (async, request) {
    console.log('MIDDLEWARE OOB', request.body)
    this._colleague.outOfBand(request.body, async())
})

Middleware.prototype._connect = cadence(function (async, socket, header) {
    async(function () {
    }, function (forward) {
        socket.spigot.emptyInto(forward.basin)
    })
})

// TODO Some thoughts on back pressure here. I was going to make it so that
// the server connect required because of back-pressure, but back-pressure is
// not as simple as all that. How would you convey the back-pressure back to the
// caller? A good answer; enqueue work in a turnstile that has a maximum size
// and 503 requests if the header can't get into the queue. Back-pressure is
// going to be case by case for some time to come.
Middleware.prototype.socket = cadence(function (async, request) {
    return cadence(function (async, response) {
        var conduit = new Conduit(request, response)
        conduit.spigot.emptyInto(new Server(function (socket, header) {
            this._colleague.client.connect(header, async())
        }).basin)
        conduit.listen(async())
    }).bind(this)
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
        island: this._island,
        id: this._kibitzer.paxos.id,
        promise: this._kibitzer.paxos.government.promise,
        republic: coalesce(this._kibitzer.paxos.republic),
        government: this._kibitzer.paxos.government
    }
})

// Export as constructor.
module.exports = Middleware
