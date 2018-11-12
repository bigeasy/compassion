var cadence = require('cadence')
var Reactor = require('reactor')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

var Caller = require('conduit/caller')
var Procedure = require('conduit/procedure')

var Kibitzer = require('kibitz')

var crypto = require('crypto')

var Vizsla = require('vizsla')

var departure = require('departure')

var Operation = require('operation')

var Conduit = require('conduit/conduit')

function Replay (destructible, options, callback) {
    this._destructible = destructible
    this._readable = options.readable
    this._destructible = destructible
    this._options = options
    this._initialize(destructible, options.inbox, options.outbox, callback)
}

Replay.prototype._initialize = cadence(function (async, destructible, inbox, outbox) {
    async(function () {
        destructible.monitor('conduit', Conduit, inbox, outbox, this, '_connect', async())
    }, function (conduit) {
        this._conduit = conduit
        return this
    })
})

Replay.prototype._connect = cadence(function (async, envelope, inbox, outbox) {
    switch (envelope.method) {
    case 'ready':
        this._destructible.monitor('play', this, '_play', inbox, outbox, null)
        outbox.push({ method: 'ready', island: this._options.island, id: this._options.id })
        break
    case 'broadcasts':
        async(function () {
            this._advance('broadcasts', async())
        }, function (envelope) {
            return [ envelope.body ]
        })
        break
    case 'snapshot':
        this._snapshot(outbox, this._destructible.monitor('snapshot', true))
        break
    }
})

Replay.prototype._snapshot = cadence(function (async, outbox) {
    var loop = async(function () {
        this._advance('snapshot', async())
    }, function (envelope) {
        outbox.push(envelope.body)
        if (envelope.body == null) {
            return [ loop.break ]
        }
    })()
})

// TODO Note that you cannot assert that the broadcasts are in any particular
// order. They are not necessarily triggered by response to a specific log
// entry. We could set up a way to associate a broadcast with an entry.
Replay.prototype._advance = cadence(function (async, type) {
    var loop = async(function () {
        async(function () {
            this._readable.read(async())
        }, function (envelope) {
            if (envelope == null) {
                return [ loop.break, null ]
            }
            envelope = JSON.parse(envelope.toString('utf8'))
            if (envelope.id == this._options.id) {
                switch (envelope.type) {
                case 'kibitzer':
                    this._kibitzer.replay(envelope.body)
                    break
                case 'paxos':
                    departure.raise(this._paxos.shift(), envelope.body)
                    break
                case 'islander':
                    departure.raise(this._islander.shift(), envelope.body)
                    break
                default:
                    departure.raise(envelope.type, type)
                    return [ loop.break, envelope ]
                }
            }
        })
    })()
})

Replay.prototype._consumed = cadence(function (async, inbox, entry) {
    var loop = async(function () {
        inbox.dequeue(async())
    }, function (envelope) {
        console.log('!', envelope)
        if (envelope == null) {
            return [ loop.break, true ]
        } else if (envelope.method == 'consumed') {
            departure.raise(envelope.promise, envelope.promise)
            return [ loop.break, false ]
        }
    })()
})

Replay.prototype._play = cadence(function (async, destructible, inbox, outbox) {
    async(function () {
        destructible.monitor('caller', Caller, async())
    }, function (caller) {
        destructible.destruct.wait(function () { caller.inbox.push(null) })
        var kibitzer = this._kibitzer = new Kibitzer({
            id: this._options.id,
            caller: caller,
            ping: this._ping,
            timeout: this._timeout
        })
        destructible.monitor('islander', kibitzer.paxos.log.pump(kibitzer.islander, 'push'), 'destructible', null)
        this._paxos = kibitzer.paxos.outbox.shifter()
        this._islander = kibitzer.islander.outbox.shifter()
        this._log = kibitzer.paxos.log.shifter()
        var loop = async(function () {
            this._advance('entry', async())
        }, function (envelope) {
            if (envelope == null) {
                return [ loop.break ]
            }
            // TODO While `entry` is null.
            var entry = this._log.shift()
            departure.raise(entry, envelope.body)
            async(function () {
                outbox.push({ method: 'entry', body: entry })
                this._consumed(inbox, entry, async())
            }, function (eos) {
                console.log('DONE SENDING', eos)
                if (eos) {
                    return [ loop.break ]
                }
            })
        })()
    })
})

module.exports = cadence(function (async, destructible, options) {
    new Replay(destructible, options, async())
})
