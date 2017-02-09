// Common utilities.
var coalesce = require('nascent.coalesce')

// Control-flow utilities.
var cadence = require('cadence')

// Create a client that will poll a particular Chaperon URL and apply the
// actions proscribed by the Chaperon to the given Kibitzer.

//
function Chaperon (options) {
    this._ua = options.ua
    this._kibitzer = options.kibitzer
    this._chaperon = options.chaperon
    this._startedAt = options.startedAt
    this._setTimeout = coalesce(options.setTimeout, setTimeout)
}

Chaperon.prototype.listen = cadence(function (async) {
    var loop = async(function () {
        async(function () {
            this._ua.fetch({
                url: this._chaperon
            }, {
                url: '/action',
                post: {
                    id: this._kibitzer.id,
                    island: this._kibitzer.island,
                    republic: this._kibitzer.legislator.republic,
                    startedAt: this._startedAt
                },
                nullify: true
            })
        }, function (action) {
            if (this._stopped) {
                return [ loop.break ]
            }
            if (action == null) {
                this._setTimeout.call(null, async(), 1000)
                return
            }
            switch (action.name) {
            case 'unstable':
            case 'unreachable':
                this._timeout = this._setTimeout.call(null, async(), 1000)
                break
            case 'recoverable':
                this._timeout = this._setTimeout.call(null, async(), 60 * 1000)
                break
            case 'bootstrap':
                this._kibitzer.legislator.naturalized = true
                this._kibitzer.bootstrap(this.startedAt)
                this._timeout = this._setTimeout(null, async(), 1000)
                break
            case 'join':
                async(function () {
                    this._kibitzer.join(action.vargs[0], async())
                }, function (enqueued) {
                    this._timeout = this._setTimeout.call(null, async(), (enqueued ? 5 : 60) * 1000)
                })
                break
            case 'splitBrain':
            case 'unrecoverable':
                this._kibizter.shutdown()
                this._stopped = true
                break
            }
        })
    })()
})

Chaperon.prototype.shutdown = function () {
    this._shutdown = true
    if (this._timeout != null) {
        this._cancelTimeout(
    }
}

module.exports = Chaperon
