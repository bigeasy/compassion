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

// Forward out of band requests to our Conduit `Requester`.

//
Middleware.prototype.outOfBand = cadence(function (async, request) {
    console.log('MIDDLEWARE OOB', request.body)
    this._colleague.outOfBand(request.body, async())
})

// TODO Some thoughts on back pressure here. I was going to make it so that
// the server connect required because of back-pressure, but back-pressure is
// not as simple as all that. How would you convey the back-pressure back to the
// caller? A good answer; enqueue work in a turnstile that has a maximum size
// and 503 requests if the header can't get into the queue. Back-pressure is
// going to be case by case for some time to come.
Middleware.prototype.socket = cadence(function (async, request) {
    return function (response) {
        response.writeHead(200, 'OK', {
            'content-type': 'application/octet-stream',
            'transfer-encoding': 'chunked'
        })
        var conduit = new Conduit(request, response)
        conduit.wrote.pump(function (envelope) {
            if (envelope == null) {
                response.end()
            } else if (envelope.body == null) {
                conduit.write.push(null)
            }
        })
        require('assert')(this._colleague)
        var server = new Server({
            object: this._colleague,
            method: '_tunnel'
        }, 'tunnel', conduit.read, conduit.write)
        conduit.listen(abend)
    }.bind(this)
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
