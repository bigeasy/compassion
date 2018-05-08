var cadence = require('cadence')
var Reactor = require('reactor')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

var Caller = require('conduit/caller')
var Procedure = require('conduit/procedure')

var Kibitzer = require('kibitz')

var crypto = require('crypto')
var Procession = require('procession')
var Throttle = require('procession/throttle')

var Vizsla = require('vizsla')
var jsonify = require('vizsla/jsonify')
var raiseify = require('vizsla/raiseify')

var departure = require('departure')

var Conference = require('./conference')

function Replay (destructible, readable) {
    this._destructible = destructible
    this._readable = readable
    this._ua = new Vizsla
    this._events = []
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /register', 'register')
        /*
            dispatcher.dispatch('GET /backlog', 'backlog')
            dispatcher.dispatch('POST /broadcast', 'broadcast')
            dispatcher.dispatch('POST /record', 'record')
            dispatcher.dispatch('GET /ping', 'ping')
            dispatcher.dispatch('GET /health', 'health')
        */
    })
}

Replay.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Replay API\n' ]
})

Replay.prototype.register = cadence(function (async, request) {
    if (this._registration != null) {
        throw 401
    }
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    async(function () {
        this._destructible.monitor('registration', true, this, 'registration', request.body, async())
    }, function () {
        return 200
    })
})

// TODO Note that you cannot assert that the broadcasts are in any particular
// order. They are not necessarily triggered by response to a specific log
// entry. We could set up a way to associate a broadcast with an entry.
Replay.prototype._advance = cadence(function (async, type) {
    var loop = async(function () {
        async(function () {
            if (this._events.length == 0) {
                return [ loop.break, null ]
            }
            this._events[0].dequeue(async())
        }, function (envelope) {
            if (envelope == null) {
                this._events.shift()
            } else if (envelope.id == this._colleague.initializer.id) {
                switch (envelope.type) {
                case 'kibitzer':
                    this._colleague.kibitzer.replay(envelope.body)
                    break
                case 'paxos':
                    departure.raise(this._colleague.paxos.shift(), envelope.body)
                    break
                case 'islander':
                    departure.raise(this._colleague.islander.shift(), envelope.body)
                    break
                default:
                    departure.raise(envelope.type, type)
                    return [ loop.break, envelope ]
                    break
                }
            }
        })
    })()
})

Replay.prototype._play = cadence(function (async) {
    async(function () {
        setTimeout(async(), 250)
    }, function () {
        // TODO Crash if there is an error.
        this._ua.fetch({
            url: this._colleague.initializer.url,
            token: this._colleague.initializer.token,
            timeout: 1000,
            gateways: [ jsonify(), raiseify() ]
        }, {
            url: './register',
            post: {
                token: this._colleague.token
            }
        }, async())
    }, function () {
        var count = 0
        var loop = async(function () {
            this._advance('entry', async())
        }, function (envelope) {
            if (envelope == null) {
                console.log('DID REACH END!!!!')
                return [ loop.break ]
            }
            var entry = this._colleague.log.shift()
            departure.raise(entry, envelope.body)
            this._colleague.conference.entry(entry, async())
        })()
    })
})

Replay.prototype._pump = cadence(function (async, events) {
    var loop = async(function () {
        this._readable.read(async())
    }, function (line) {
        if (line == null) {
           console.log('I TOO REACHED END')
           events.push(null)
           return [ loop.break ]
        } else {
           events.enqueue(JSON.parse(line.toString()), async())
        }
    })()
})

Replay.prototype.registration = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
    }, function (caller) {
        destructible.destruct.wait(function () { caller.inbox.push(null) })
        var kibitzer = new Kibitzer({
            id: envelope.id,
            caller: caller,
            ping: this._ping,
            timeout: this._timeout
        })
        kibitzer.paxos.log.pump(kibitzer.islander, 'enqueue', destructible.monitor('islander'))
        // TODO Wonky. Should destroy out of Kibitzer.
        destructible.destruct.wait(function () {
            kibitzer.paxos.log.push(null)
        })
        async(function () {
            crypto.randomBytes(32, async())
        }, function (bytes) {
            var token = bytes.toString('hex')
            this._registration = {}
            var log = new Throttle(3)
            this._events.unshift(log.trailer)
            this._pump(log, destructible.monitor('pump'))
            this._colleague = {
                token: token,
                initializer: envelope,
                kibitzer: kibitzer,
                conference: new Conference(destructible, {
                    acclimate: function () {},
                    publish: function () {},
                    broadcasts: cadence(function (async, promise) {
                        async(function () {
                            this._advance('broadcasts', async())
                        }, function (envelope) {
                            return [ envelope.body ]
                        })
                    }).bind(this)
                }, envelope, kibitzer),
                paxos: kibitzer.paxos.outbox.shifter(),
                islander: kibitzer.islander.outbox.shifter(),
                log: kibitzer.paxos.log.shifter()
            }
            this._play(destructible.monitor('play'))
        }, function () {
            console.log('I am here')
            return []
        })
    })
})

module.exports = cadence(function (async, destructible, options) {
    var replay = new Replay(destructible, options.readable)
    var server = http.createServer(replay.reactor.middleware)
    destroyer(server)
    destructible.destruct.wait(server, 'destroy')
    delta(destructible.monitor('http')).ee(server).on('close')
    options.bind.listen(server, async())
    return replay
})
