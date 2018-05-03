var cadence = require('cadence')
var Vizsla = require('vizsla')
var raiseify = require('vizsla/raiseify')
var jsonify = require('vizsla/jsonify')

var Caller = require('conduit/caller')
var Procedure = require('conduit/procedure')
var Kibitzer = require('kibitz')
var UserAgent = require('./ua')

var crypto = require('crypto')

var Monotonic = require('monotonic').asString

// Sencha Connect middleware builder.
var Reactor = require('reactor')

var Conference = require('./conference')

var url = require('url')

var Procession = require('procession')

var coalesce = require('extant')

var Timer = require('happenstance/timer')
var Scheduler = require('happenstance/scheduler')

var Keyify = require('keyify')

function Local (destructible, population, colleagues, networkedUrl) {
    var scheduler = new Scheduler
    var timer = new Timer(scheduler)
    destructible.destruct.wait(scheduler, 'clear')
    destructible.destruct.wait(timer.events.pump(this, '_scheduled', destructible.monitor('timer')), 'destroy')
    destructible.destruct.wait(scheduler.events.pump(timer, 'enqueue', destructible.monitor('scheduler')), 'destroy')
    this._destructible = destructible
    this.colleagues = colleagues
    this._ping = 1000
    this._ua = new Vizsla
    this._timeout = 5000
    this._httpTimeout = 5000
    this._instance = 0
    this._networkedUrl = networkedUrl
    this._population = population
    this.events = new Procession
    this.scheduler = scheduler
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

Local.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Local API\n' ]
})

Local.prototype.colleague = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, this._httpTimeout, envelope.island, envelope.id), 'request', async())
    }, function (caller, procedure) {
        caller.outbox.pump(procedure.inbox)
        destructible.destruct.wait(function () { caller.inbox.push(null) })
        procedure.outbox.pump(caller.inbox)
        destructible.destruct.wait(function () { procedure.inbox.push(null) })
        destructible.monitor('kibitzer', Kibitzer, {
            caller: caller,
            id: envelope.id,
            ping: this._ping,
            timeout: this._timeout
        }, async())
    }, function (kibitzer) {
        async(function () {
            crypto.randomBytes(32, async())
        }, function (bytes) {
            if (this.colleagues.island[envelope.island] == null) {
                this.colleagues.island[envelope.island] = {}
            }
            var conference = new Conference(destructible, envelope.id, envelope, kibitzer)
            var log = kibitzer.paxos.log.pump(conference, 'entry', destructible.monitor('entries'))
            destructible.destruct.wait(function () { kibitzer.paxos.log.push(null) })
            destructible.destruct.wait(log, 'destroy')
            var events = this.events
            kibitzer.paxos.log.pump(function (entry) {
                if (entry != null) {
                    events.push({
                        type: 'entry',
                        id: envelope.id,
                        entry: entry
                    })
                }
            }, destructible.monitor('events'))
            destructible.destruct.wait(this, function () {
                delete this.colleagues.island[envelope.island][envelope.id]
            })
            destructible.destruct.wait(this, function () {
                this.scheduler.unschedule(Keyify.stringify({
                    island: envelope.island,
                    id: envelope.id
                }))
            })
            var token = bytes.toString('hex')
            var colleague = this.colleagues.island[envelope.island][envelope.id] = {
                token: token,
                events: events,
                initalizer: envelope,
                kibitzer: kibitzer,
                conference: conference,
                createdAt: Date.now(),
                ua: new Vizsla().bind({
                    url: envelope.url,
                    gateways: [ jsonify(), raiseify() ]
                })
            }
            this.colleagues.token[token] = colleague
            this.scheduler.schedule(Date.now(), Keyify.stringify({
                island: colleague.initalizer.island,
                id: colleague.initalizer.id
            }), {
                name: 'discover',
                island: colleague.initalizer.island,
                id: colleague.initalizer.id
            })
            return { grant_type: 'authorization_code', access_token: token }
        })
    })
})

var discover = require('./discover')
var embark = require('./embark')

Local.prototype._overwatch = cadence(function (async, envelope, members, complete) {
    var island = this.colleagues.island[envelope.island]
    if (island == null) {
        return
    }
    var colleague = island[envelope.id]
    if (colleague == null) {
        return null
    }
    var action
    switch (envelope.name) {
    case 'discover':
        action = discover(envelope.id, members, complete)
        break
    case 'embark':
        action = embark(members, 0)
        break
    case 'recoverable':
        break
    }
    switch (action.action) {
    case 'bootstrap':
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.initalizer.properties, {})))
        properties.url = action.url
        colleague.kibitzer.bootstrap(0, properties)
        break
    case 'join':
        colleague.kibitzer.join(0)
        this.scheduler.schedule(Date.now(), Keyify.stringify({
            island: envelope.island,
            id: envelope.id
        }), {
            name: 'embark',
            island: envelope.island,
            id: envelope.id,
            url: action.url,
            republic: action.republic
        })
        break
    case 'embark':
        this.scheduler.schedule(Date.now() + 5000, Keyify.stringify({
            island: envelope.island,
            id: envelope.id
        }), {
            name: 'embark',
            island: envelope.island,
            id: envelope.id,
            url: envelope.url,
            republic: envelope.republic
        })
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.initalizer.properties, {})))
        properties.url = envelope.url
        this._ua.fetch({
            url: action.url,
            timeout: 1000,
            gateways: [ jsonify(), raiseify() ]
        }, {
            url: './arrive',
            post: {
                republic: envelope.republic,
                id: colleague.kibitzer.paxos.id,
                cookie: colleague.kibitzer.paxos.cookie,
                properties: properties
            }
        }, async())
        break
    case 'retry':
        console.log(envelope, action, members)
        process.exit()
        this.scheduler.schedule(now, event.id, { type: 'discover'  })
        break
    }
})

Local.prototype._scheduled = cadence(function (async, envelope) {
    if (!(envelope != null && envelope.module == 'happenstance' && envelope.method == 'event')) {
        return
    }
    async(function () {
        this._population.census(envelope.body.island, async())
    }, function (members, complete) {
        this._overwatch(envelope.body, members, complete, async())
    })
})

Local.prototype._getColleague = function (request) {
    if (request.authorization.scheme != 'Bearer') {
        throw 401
    }
    var colleague = this.colleagues.token[request.authorization.credentials]
    if (colleague == null) {
        throw 401
    }
    return colleague
}

// TODO Abend if the colleague is not waiting on a `join` notification.
Local.prototype.backlog = cadence(function (async, request) {
    var colleague = this._getColleague(request)
    var government = colleague.kibitzer.paxos.government
    async(function () {
        colleague.ua.fetch({
            url: government.properties[government.majority[0]].url
        }, {
            url: './backlog',
            post: {
                promise: government.arrived.promise[colleague.initalizer.id]
            },
            gateways: [ null, raiseify() ]
        }, async())
    }, function (stream, response) {
        return [ 200, response.headers, function (response) { stream.pipe(response) } ]
    })
})

Local.prototype.register = cadence(function (async, request) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    async(function () {
        this._destructible.monitor([ 'colleague', this._instance++ ], true, this, 'colleague', request.body, async())
    }, function (result) {
        return result
    })
})

Local.prototype.record = cadence(function (async, request) {
    this.events.push({
        module: 'compassion',
        method: 'record',
        body: request.body
    })
    return 200
})

Local.prototype.broadcast = cadence(function (async, request) {
    var colleague = this._getColleague(request)
    colleague.conference.broadcast(request.body.method, request.body.message)
    return 200
})

module.exports = Local
