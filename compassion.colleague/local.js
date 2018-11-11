var cadence = require('cadence')
var UserAgent = require('vizsla')
var logger = require('prolific.logger').createLogger('compassion.colleague')

var Kibitzer = require('kibitz')
var Procession = require('procession')

var coalesce = require('extant')

var Timer = require('happenstance/timer')
var Scheduler = require('happenstance/scheduler')

var Keyify = require('keyify')

var Recorder = require('./recorder')

var Conduit = require('conduit/conduit')

var Deserialize = require('procession/deserialize')

function Local (destructible, colleagues, options) {
    this._destructible = destructible

    this.colleagues = colleagues

    this._Conference = options.Conference
    this._population = options.population
    this._networkedUrl = 'http://' + options.bind.networked.address + ':' + options.bind.networked.port + '/'

    var ping = coalesce(options.ping, {})
    var timeout = coalesce(options.timeout, {})

    this._ping = {
        paxos: coalesce(ping.paxos, 1000),
        chaperon: coalesce(timeout.paxos, 1000)
    }
    this._timeout = {
        chaperon: coalesce(timeout.paxos, 5000),
        paxos: coalesce(timeout.paxos, 5000),
        http: coalesce(timeout.http, 5000)
    }

    var scheduler = new Scheduler
    var timer = new Timer(scheduler)

    destructible.destruct.wait(scheduler, 'clear')
    destructible.monitor('timer', timer.events.pump(this, '_scheduled'), 'destructible', null)
    destructible.monitor('scheduler', scheduler.events.pump(timer, 'enqueue'), 'destructible', null)

    this.scheduler = scheduler

    this._instance = 0
    this._ua = new UserAgent

    this.events = new Procession
}

Local.prototype._record = cadence(function (async, destructible, kibitzer, id) {
    destructible.monitor('played', kibitzer.played.pump(new Recorder(this.events, id, 'kibitzer'), 'record'), 'destructible', null)
    destructible.monitor('paxos', kibitzer.paxos.outbox.pump(new Recorder(this.events, id, 'paxos'), 'record'), 'destructible', null)
    destructible.monitor('islander', kibitzer.islander.outbox.pump(new Recorder(this.events, id, 'islander'), 'record'), 'destructible', null)
    return kibitzer
})

Local.prototype.colleague = cadence(function (async, destructible, inbox, outbox, envelope) {
    var kibitzer
    async(function () {
        var ua = new UserAgent().bind({ timeout: this._timeout.http })
        kibitzer = new Kibitzer({
            id: envelope.id,
            ping: this._ping.paxos,
            timeout: this._timeout.paxos,
            ua: {
                send: cadence(function (async, envelope) {
                    logger.info('recorded', { source: 'ua', method: envelope.method, $envelope: envelope })
                    ua.fetch({
                        url: envelope.to.url
                    }, {
                        url: './kibitz',
                        post: envelope,
                        parse: 'json',
                        nullify: true
                    }, async())
                })
            }
        })
        destructible.monitor('kibitzer', kibitzer, 'listen', async())
    }, function () {
        destructible.monitor('record', this, '_record', kibitzer, envelope.id, async())
    }, function (kibitzer) {
        if (this.colleagues.island[envelope.island] == null) {
            this.colleagues.island[envelope.island] = {}
        }
        // TODO Move `Conduit` to `Procession` and call these `conduits`.
        var events = this.events
        /*
        // Notice that conference here references the colleague ua. All of
        // this is rather slapdash, but that's how these last little bits of
        // assembly tend to be. We've deferred the circular references to
        // the final assembly, the upper most abstractions, but we can't
        // chase them out of existence for they exist.
        var conference = new this._Conference(destructible, {
            acclimate: function () { kibitzer.acclimate() },
            publish: function (record, envelope) { kibitzer.publish(envelope) },
            broadcasts: cadence(function (async, promise) {
                async(function () {
                    var government = kibitzer.paxos.government
                    var leaderUrl = government.properties[government.majority[0]].url
                    colleague.ua.fetch({
                        url: leaderUrl
                    }, {
                        url: './broadcasts',
                        post: { promise: promise },
                        raise: true,
                        parse: 'json'
                    }, async())
                }, function (body) {
                    events.push({
                        type: 'broadcasts',
                        id: colleague.initializer.id,
                        body: body
                    })
                    return [ body ]
                })
            })
        }, envelope, kibitzer)
        */
        // TODO Restore below.
        /*
        conference.log.pump(new Recorder(this.events, envelope.id, 'entry'), 'record', destructible.monitor('log'))
        destructible.destruct.wait(function () { conference.log.push(null) })
        conference.consumed.pump(new Recorder(this.events, envelope.id, 'consumed'), 'record', destructible.monitor('consumed'))
        destructible.destruct.wait(function () { conference.consumed.push(null) })
        */
        // TODO Restore above.
        // kibitzer.paxos.log.pump(new Recorder(this.events, envelope.id, 'entry'), 'record', destructible.monitor('events'))
        destructible.monitor('pinged', kibitzer.paxos.pinged.pump(this, function () {
            this.scheduler.schedule(Date.now() + this._timeout.chaperon, Keyify.stringify({
                island: envelope.island,
                id: envelope.id
            }), {
                name: 'recoverable',
                island: envelope.island,
                id: envelope.id
            })
        }), 'destructible', null)
        destructible.destruct.wait(this, function () {
            this.scheduler.unschedule(Keyify.stringify({
                island: envelope.island,
                id: envelope.id
            }))
        })
        var colleague = this.colleagues.island[envelope.island][envelope.id] = {
            destructible: destructible,
            id: envelope.id,
            island: envelope.island,
            properties: envelope.properties,
            kibitzer: kibitzer,
            createdAt: Date.now(),
            destroyed: false
        }
        var connection = new Connection(this._ua, colleague, this.scheduler)
        destructible.monitor('entries', kibitzer.paxos.log.pump(connection, 'entry'), 'destructible', null)
        destructible.destruct.wait(this, function () {
            var colleague = this.colleagues.island[envelope.island][envelope.id]
            delete this.colleagues.island[envelope.island][envelope.id]
        })
        destructible.markDestroyed(colleague)
        async(function () {
            destructible.monitor('conduit', Conduit, inbox, outbox, connection, 'connect', async())
        }, function(conduit) {
            colleague.conduit = conduit
            return colleague
        })
    })
})

var discover = require('./discover')
var embark = require('./embark')
var recoverable = require('./recoverable')

function Connection (ua, colleague, scheduler) {
    this.ua = ua
    this.destructible = colleague.destructible
    this.scheduler = scheduler
    this.kibitzer = colleague.kibitzer
    this.colleague = colleague
}

Connection.prototype.connect = cadence(function (async, envelope, inbox, outbox) {
    switch (envelope.method) {
    case 'ready':
        this.destructible.monitor('inbox', inbox.pump(this, 'receive'), 'destructible', null)
        this.colleague.outbox = outbox
        this.scheduler.schedule(Date.now(), Keyify.stringify({
            island: this.colleague.island,
            id: this.colleague.id
        }), {
            name: 'discover',
            island: this.colleague.island,
            id: this.colleague.id
        })
        outbox.push({
            method: 'ready',
            island: this.colleague.island,
            id: this.colleague.id,
            properties: this.colleague.properties
        })
        break
    case 'broadcasts':
        var government = this.kibitzer.paxos.government
        var leaderUrl = government.properties[government.majority[0]].url
        this.ua.fetch({
            url: leaderUrl
        }, {
            url: './broadcasts',
            post: { promise: envelope.promise },
            raise: true,
            parse: 'json'
        }, async())
        break
    case 'snapshot':
        var government = this.kibitzer.paxos.government
        var leaderUrl = government.properties[government.majority[0]].url
        async(function () {
            this.ua.fetch({
                url: leaderUrl
            }, {
                url: './snapshot',
                post: { promise: envelope.promise },
                raise: true,
                parse: 'stream'
            }, async())
        }, function (stream, response) {
            Deserialize(stream, outbox, async())
        })
        break
    }
})

Connection.prototype.entry = cadence(function (async, envelope) {
    this.colleague.outbox.push({ method: 'entry', body: envelope })
})

Connection.prototype.receive = cadence(function (async, envelope) {
    console.log('receive >', envelope)
    if (envelope == null) {
        return
    }
    switch (envelope.method) {
    case 'acclimate':
        this.colleague.kibitzer.acclimate()
        return []
    case 'broadcast':
    case 'reduce':
        console.log('--- broadcast -----------------------------------------------------------------------------')
        console.log(envelope)
        this.colleague.kibitzer.publish(envelope)
        return []
    }
})

Local.prototype._getColleagueByIslandAndId = function (island, id) {
    var island = this.colleagues.island[island]
    if (island != null) {
        var colleague = island[id]
        if (colleague != null) {
            return colleague
        }
    }
    return null
}

Local.prototype.terminate = function (island, id) {
    var colleague = this._getColleagueByIslandAndId(island, id)
    if (colleague != null) {
        colleague.destructible.destroy()
    }
}

Local.prototype.ids = function (island) {
    var ids = []
    var island = this.colleagues.island[island]
    if (island != null) {
        ids = Object.keys(island).sort()
    }
    return ids
}

Local.prototype._overwatch = cadence(function (async, colleague, envelope, members, complete) {
    var action
    switch (envelope.body.name) {
    case 'discover':
        action = discover(envelope.body.id, members, complete)
        break
    case 'embark':
        action = embark(members, 0)
        break
    case 'recoverable':
        action = recoverable(envelope.body.id, members)
        break
    }
    logger.notice('overwatch', {
        $members: members,
        $envelope: envelope,
        $action: action,
        complete: complete
    })
    switch (action.action) {
    case 'bootstrap':
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.properties, {})))
        properties.url = action.url
        colleague.kibitzer.bootstrap(0, properties)
        break
    case 'join':
        colleague.kibitzer.join(0)
        this.scheduler.schedule(Date.now(), Keyify.stringify({
            island: envelope.body.island,
            id: envelope.body.id
        }), {
            name: 'embark',
            island: envelope.body.island,
            id: envelope.body.id,
            url: action.url,
            republic: action.republic
        })
        break
    case 'embark':
        // Schedule a subsequent embarkation. Once our Paxos object starts
        // receiving message, the embarkation is cleared and replaced with a
        // recoverable check.
        this.scheduler.schedule(Date.now() + this._ping.chaperon, Keyify.stringify({
            island: envelope.body.island,
            id: envelope.body.id
        }), {
            name: 'embark',
            island: envelope.body.island,
            id: envelope.body.id,
            url: envelope.body.url,
            republic: envelope.body.republic
        })
        // If this fails, we don't care. Embarkation is designed to be
        // asynchronous in the macro. You send a message. Maybe it gets there,
        // maybe it doesn't. You'll know when the Paxos object starts working.
        // Until then, keep sending embarkation requests. The leader knows how
        // to deal with duplicate or in-process requests.
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.properties, {})))
        properties.url = envelope.body.url
        this._ua.fetch({
            url: action.url,
            timeout: this._timeout.http,
            nullify: true,
            parse: 'json'
        }, {
            url: './embark',
            post: {
                republic: envelope.body.republic,
                id: colleague.kibitzer.paxos.id,
                cookie: colleague.kibitzer.paxos.cookie,
                properties: properties
            }
        }, async())
        break
    case 'retry':
        this.scheduler.schedule(Date.now() + this._ping.chaperon, envelope.key, envelope.body)
        break
    case 'unrecoverable':
        colleague.destructible.destroy()
        break
    }
})

// Race conditions to consider &mdash; events are not going to fire for a
// destroyed colleague because we clear their schedule on destruct. However, we
// the colleague might get destroyed while we are gathering the census. That is
// why we check that the colleague still exists in `_overwatch`.
//
// In overwatch, we schedule our next action, an synchronous operation, before
// we do anything asynchronous, so we know that we have a good colleague. Our
// asynchronous operation is a tail operation. If something particularly bad
// happens.

//
Local.prototype._scheduled = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    var colleague = this._getColleagueByIslandAndId(envelope.body.island, envelope.body.id)
    async(function () {
        this._population.census(envelope.body.island, envelope.body.id, async())
    }, function (members, complete) {
        if (!colleague.destroyed) {
            this._overwatch(colleague, envelope, members, complete, async())
        }
    })
})

Local.prototype.register = cadence(function (async, inbox, outbox, registration) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    this._destructible.monitor([ 'colleague', this._instance++ ], true, this, 'colleague', inbox, outbox, registration, async())
})

Local.prototype.record = cadence(function (async, request) {
    var colleague = this._getColleagueByToken(request)
    this.events.push({
        type: 'record',
        id: colleague.id,
        body: request.body
    })
    return request.body
})

Local.prototype.broadcast = cadence(function (async, request) {
    var colleague = this._getColleagueByToken(request)
    colleague.conference.broadcast(request.body.method, request.body.message)
    return 200
})

Local.prototype.health = cadence(function () {
    var health = { islands: {} }
    for (var island in this.colleagues.island) {
        health.islands[island] = {}
        for (var id in this.colleagues.island[island]) {
            health.islands[island][id] = {
                government: this.colleagues.island[island][id].kibitzer.paxos.government
            }
        }
    }
    return health
})

module.exports = Local
