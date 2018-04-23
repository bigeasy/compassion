var cadence = require('cadence')
var Vizsla = require('vizsla')
var raiseify = require('vizsla/raiseify')
var jsonify = require('vizsla/jsonify')

var Caller = require('conduit/caller')
var Procedure = require('conduit/procedure')
var Kibitzer = require('kibitz')
var UserAgent = require('./ua')

var Monotonic = require('monotonic').asString

// Sencha Connect middleware builder.
var Reactor = require('reactor')

var Conference = require('./conference')

var Pump = require('procession/pump')

var url = require('url')

var Procession = require('procession')

function Local (destructible, colleagues, networkedUrl) {
    this._destructible = destructible
    var count = 0
    this._destructible.destruct.wait(function () {
        console.log('local is destructing!!!!', ++count)
    })
    this.colleagues = colleagues
    this._ping = 1000
    this._ua = new Vizsla
    this._timeout = 5000
    this._httpTimeout = 5000
    this._instance = 0
    this._networkedUrl = networkedUrl
    this.events = new Procession
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /register', 'register')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /publish', 'publish')
        dispatcher.dispatch('GET /ping', 'ping')
        dispatcher.dispatch('GET /health', 'health')
    })
}

Local.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Local API\n' ]
})

Local.prototype.colleague = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, this._httpTimeout, envelope.island, envelope.id), 'request', async())
    }, function (caller, procedure) {
        caller.read.shifter().pumpify(procedure.write)
        destructible.destruct.wait(function () { caller.write.push(null) })
        procedure.read.shifter().pumpify(caller.write)
        destructible.destruct.wait(function () { procedure.write.push(null) })
        destructible.monitor('kibitzer', Kibitzer, {
            caller: caller,
            id: envelope.id,
            ping: this._ping,
            timeout: this._timeout
        }, async())
    }, function (kibitzer) {
        var existed = false
        if (this.colleagues.island[envelope.island] == null) {
            this.colleagues.island[envelope.island] = {}
        } else {
            existed = true
        }
        var conference = new Conference(envelope.id, envelope)
        /*
        new Pump(conference.outbox.shifter(), function (envelope) {
            switch(coalesce(envelope, {}).method) {
            case 'acclimated':
                kibitzer.acclimated()
                break
            case 'reduce':
                kibitzer.publish(envelope)
                break
            }
        }).pumpify(destructible.monitor('conference'))
        */
        destructible.destruct.wait(function () { kibitzer.paxos.log.push(null) })
        new Pump(kibitzer.paxos.log.shifter(), conference, 'entry').pumpify(destructible.monitor('entries'))
        var events = this.events
        new Pump(kibitzer.paxos.log.shifter(), function (entry) {
            if (entry != null) {
                events.push({
                    type: 'entry',
                    id: envelope.id,
                    entry: entry
                })
            }
        }).pumpify(destructible.monitor('events'))
        var colleague = this.colleagues.island[envelope.island][envelope.id] = {
            events: events,
            initalizer: envelope,
            kibitzer: kibitzer,
            conference: conference,
            ua: new Vizsla().bind({
                url: envelope.url,
                gateways: [ jsonify(), raiseify() ]
            })
        }
        async(function () {
            var kibitzUrl = url.resolve(this._networkedUrl, [ '', envelope.island, envelope.id, 'kibitz' ].join('/'))
            if (existed) {
                var island = this.colleagues.island[envelope.island]
                var government = Object.keys(island).map(function (id) {
                    return island[id].kibitzer.paxos.government
                }).sort(function (a, b) {
                    return Monotonic.compare(a.promise, b.promise)
                }).pop()
                var leaderUrl = government.properties[government.majority[0]].url
                this._ua.fetch({
                    url: kibitzUrl,
                    timeout: 1000,
                    gateways: [ jsonify(), raiseify() ]
                }, {
                    url: './join',
                    post: {
                        republic: 0,
                        url: { self: kibitzUrl, leader: leaderUrl }
                    }
                }, async())
            } else {
                this._ua.fetch({
                    url: this._networkedUrl,
                    timeout: 1000,
                    gateways: [ jsonify(), raiseify() ]
                }, {
                    url: [ '', envelope.island, envelope.id, 'bootstrap' ].join('/'),
                    post: {
                        republic: 0,
                        url: { self: kibitzUrl }
                    }
                }, async())
            }
        }, function () {
            return 200
        })
    })
})

Local.prototype._getColleague = function () {
    if (request.authorization.scheme != 'Bearer') {
        throw 401
    }
    var colleague = this.colleagues.token[request.authorization.credentials]
    if (colleague == null) {
        throw 401
    }
    return colleague
}

Local.prototype.backlog = cadence(function (async, request) {
    var colleague = this._getColleague(request)
    async(function () {
        colleague.ua.fetch({
            url: this._getLeaderURL()
        }, {
            url: [ 'backlog', colleague.island ].join('/'),
            post: {
                promise: colleague.kibitz.paxos.government.arrivals.promise[this.id]
            },
            gateways: []
        }, async())
    }, function (stream, response) {
        if (!response.okay) {
            throw 503
        }
        return function (response) { stream.pipe(response) }
    })
})

Local.prototype.broadcast = cadence(function (async, request) {
    this._getColleague(request).broadcast(request.method, request.message)
})

Local.prototype.register = cadence(function (async, request) {
    console.log('why no ?')
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    async(function () {
        this._destructible.monitor([ 'colleague', this._instance++ ], true, this, 'colleague', request.body, async())
    }, function (result) {
        console.log(result)
        return result
    })
})

module.exports = Local