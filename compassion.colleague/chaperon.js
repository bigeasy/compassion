// Common utilities.
var coalesce = require('extant')

// Control-flow utilities.
var cadence = require('cadence')

// An evented sempahore.
var Signal = require('signal')

var Kibitzer = require('kibitz')

// Create a client that will poll a particular Chaperon URL and apply the
// actions proscribed by the Chaperon to the given Kibitzer.

//
function Chaperon (options) {
    this._ua = options.ua
    this._session = { url: options.chaperon }
    this._island = options.island
    this._createKibitzer = options.createKibitzer
    this._republic = null
    this._colleague = options.colleague
    this._startedAt = options.startedAt
    this._signal = new Signal
    this.destroyed = false
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
    var loop = async(function () {
        if (this.destroyed) {
            return [ loop.break ]
        }
        this._fetch = this._ua.fetch(this._session, {
            url: '/action',
            post: {
                island: this._island,
                republic: this._republic,
                id: this._id,
                startedAt: this._startedAt
            },
            nullify: true
        }, async())
    }, function (action) {
        this._fetch = null
        if (action == null) {
            this._signal.wait(1000, async())
            return
        }
        console.log(action)
        this._action(action, 1000, async())
    })()
})

Chaperon.prototype._action = cadence(function (async, action, second) {
    switch (action.name) {
    case 'unstable':
    case 'unreachable':
        this._signal.wait(second, async())
        break
    case 'recoverable':
        this._signal.wait(60 * second, async())
        break
    case 'bootstrap':
        // TODO What to do about errors? If we're not able to successfully
        // `getProperties` what do we do then? Is it an error that is not
        // going to happen or not manifest itself here? There might be an
        // end of stream error that would raise an exception ending the loop
        // that way.
        async(function () {
            console.log('GETTING PROPERTIES')
            this._colleague.getProperties(async())
        }, function (properties) {
            console.log('GOT PROPERTIES', properties)
            this._kibitzer = this._createKibitzer.call(null, this._startedAt)
            properties.url = action.url.self
            this._kibitzer.bootstrap(properties)
            this._signal.wait(second, async())
        })
        break
    case 'join':
        async(function () {
            this._colleague.getProperties(async())
        }, function (properties) {
            this._kibitzer = this._createKibitzer.call(null, action.republic)
            properties.url = action.url.self
            this._kibitzer.join(action.url.leader, properties, async())
        }, function (enqueued) {
            this._signal.wait((enqueued ? 5 : 60) * second, async())
        })
        break
    case 'splitBrain':
    case 'unrecoverable':
        if (this._kibitzer != null) {
            this._kibitzer.destroy()
        }
        this.destroyed = true
        break
    }
})

Chaperon.prototype.destroy = function () {
    if (!this.destroyed) {
        this.destroyed = true
        this._signal.unlatch()
        if (this._fetch != null) {
            this._fetch.cancel()
        }
    }
}

module.exports = Chaperon
