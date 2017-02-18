// Common utilities.
var coalesce = require('nascent.coalesce')

// Control-flow utilities.
var cadence = require('cadence')

// An evented sempahore.
var Signal = require('signal')

// Create a client that will poll a particular Chaperon URL and apply the
// actions proscribed by the Chaperon to the given Kibitzer.

//
function Chaperon (options) {
    this._ua = options.ua
    this._session = { url: options.chaperon }
    this._island = options.island
    this._kibitzer = options.kibitzer
    this._colleague = options.colleague
    this._startedAt = options.startedAt
    this._signal = new Signal
    this._wait = null
    this._shutdown = false
}

Chaperon.prototype.listen = cadence(function (async) {
    // TODO Note this pattern. I've come close to using destrutible in this
    // class and the creation of the destructible module drives home for me the
    // fact that this is necessarily complex. I don't want cadences to become
    // compostible. I want them to always reflect a control flow and be directly
    // readable, but adding an anonymous function wrapper means that I'd have to
    // break this up further. Can't help it if someone else wants to use Cadence
    // and gets the idea that a sub-cadence is a reuse facility. Can't help it
    // if someone want to make a bunch of wrappery nonsense for Cadence.
    var breakIfShutdown = function () {
        if (this._shutdown) {
            return loop.break
        }
    }
    var loop = async(function () {
        this._wait = null
        this._ua.fetch(this._session, {
            url: '/action',
            post: {
                island: this._island,
                republic: coalesce(this._kibitzer.paxos.republic),
                id: this._kibitzer.paxos.id,
                startedAt: this._startedAt
            },
            nullify: true
        }, async())
    }, breakIfShutdown, function (action) {
        if (action == null) {
            this._wait = this._signal.wait(1000, async())
            return
        }
        console.log(action)
        switch (action.name) {
        case 'unstable':
        case 'unreachable':
            this._wait = this._signal.wait(1000, async())
            break
        case 'recoverable':
            this._wait = this._signal.wait(60 * 1000, async())
            break
        case 'bootstrap':
            // TODO Am I really supposed to do this?
            this._kibitzer.paxos.naturalized = true
            async(function () {
                this._colleague.getProperties(async())
            }, function (properties) {
                properties.url = action.url.self
                this._kibitzer.bootstrap(this._startedAt, properties)
                this._wait = this._signal.wait(1000, async())
            })
            break
        case 'join':
            async(function () {
                this._colleague.getProperties(async())
            }, function (properties) {
                properties.url = action.url.self
                this._kibitzer.join({
                    url: action.url.leader,
                    republic: action.republic
                }, properties, async())
            }, function (enqueued) {
                this._wait = this._signal.wait((enqueued ? 5 : 60) * 1000, async())
            })
            break
        case 'splitBrain':
        case 'unrecoverable':
            this._kibizter.shutdown()
            this._stopped = true
            break
        }
    }, breakIfShutdown)()
})

Chaperon.prototype.destroy = function () {
    this._shutdown = true
    if (this._wait != null) {
        this._signal.cancel(this._wait)()
        this._wait = null
    }
}

module.exports = Chaperon
