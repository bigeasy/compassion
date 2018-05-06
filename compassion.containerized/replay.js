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

var Vizsla = require('vizsla')
var jsonify = require('vizsla/jsonify')
var raiseify = require('vizsla/raiseify')

var departure = require('departure')

var Conference = require('./conference')

function Replay (destructible, readable) {
    this.events = new Procession
    this._destructible = destructible
    this._readable = readable
    this._ua = new Vizsla
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /register', 'register')
        dispatcher.dispatch('GET /backlog', 'backlog')
        dispatcher.dispatch('POST /broadcast', 'broadcast')
        dispatcher.dispatch('POST /record', 'record')
        dispatcher.dispatch('GET /ping', 'ping')
        dispatcher.dispatch('GET /health', 'health')
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
Replay.prototype._advance = cadence(function (async, id) {
    var loop = async(function () {
        async(function () {
            this._readable.read(async())
        }, function (line) {
            if (line == null) {
                return [ loop.break, null ]
            }
            var entry = JSON.parse(line.toString())
            if (entry.id == id) {
                return [ loop.break, entry ]
            }
        })
    })()
})

Replay.prototype._play = cadence(function (async, colleague) {
    var outboxes = {
        paxos: colleague.kibitzer.paxos.outbox.shifter(),
        islander: colleague.kibitzer.islander.outbox.shifter(),
        log: colleague.kibitzer.paxos.log.shifter()
    }
    async(function () {
        setTimeout(async(), 250)
    }, function () {
        // TODO Crash if there is an error.
        this._ua.fetch({
            url: colleague.initializer.url,
            token: colleague.initializer.token,
            timeout: 1000,
            gateways: [ jsonify(), raiseify() ]
        }, {
            url: './register',
            post: {
                token: colleague.token
            }
        }, async())
    }, function () {
        var count = 0
        var loop = async(function () {
            this._advance(colleague.initializer.id, async())
        }, function (envelope) {
            if (envelope == null) {
                console.log('DID REACH END!!!!')
                return [ loop.break ]
            }
            switch (envelope.type) {
            case 'kibitzer':
                if (envelope.body.method == 'publish') {
                    if (envelope.body.body.key == 'message[3/0](2)') {
                        console.log('kibitzer', envelope.body)
                    }
                }
                colleague.kibitzer.replay(envelope.body)
                break
            case 'entry':
                var entry = outboxes.log.shift()
                departure.raise(entry, envelope.body)
                colleague.conference.entry(entry, async())
                break
            case 'paxos':
                departure.raise(outboxes.paxos.shift(), envelope.body)
                break
            case 'islander':
                if (envelope.body.cookie == '2') {
                    console.log('ISLANDER!!!', envelope.body)
                }
                departure.raise(outboxes.islander.shift(), envelope.body)
                break
            }
        })()
    })
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
            console.log('I DID NULL IT')
            kibitzer.paxos.log.push(null)
        })
        async(function () {
            crypto.randomBytes(32, async())
        }, function (bytes) {
            var token = bytes.toString('hex')
            this._registration = {}
            this._play({
                token: token,
                initializer: envelope,
                events: this.events.shifter(),
                kibitzer: kibitzer,
                conference: new Conference(destructible, envelope, kibitzer)
            }, destructible.monitor('play'))
        })
        return []
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
