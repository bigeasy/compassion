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

var Reader = require('procession/reader')

function Local (destructible, colleagues, options) {
    this._destructible = destructible

    this.colleagues = colleagues

    this._Conference = options.Conference
    this._population = options.population
    this._networkedUrl = 'http://' + options.bind.address + ':' + options.bind.port + '/'

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
    destructible.durable('timer', timer.events.pump(this, '_scheduled'), 'destructible', null)
    destructible.durable('scheduler', scheduler.events.pump(timer, 'enqueue'), 'destructible', null)

    this.scheduler = scheduler

    this._instance = 0
    this._ua = new UserAgent().bind({ timeout: this._timeout.http })

    this.events = new Procession
}

Local.prototype._record = cadence(function (async, destructible, kibitzer, id) {
    destructible.durable('played', kibitzer.played.pump(new Recorder(this.events, id, 'kibitzer'), 'record'), 'destructible', null)
    destructible.durable('paxos', kibitzer.paxos.outbox.pump(new Recorder(this.events, id, 'paxos'), 'record'), 'destructible', null)
    destructible.durable('islander', kibitzer.islander.outbox.pump(new Recorder(this.events, id, 'islander'), 'record'), 'destructible', null)
    return kibitzer
})

Local.prototype._connect = cadence(function (async, destructible, inbox, outbox) {
    var shifter = inbox.shifter()
    var connection = new Connection(destructible, this)
    async(function () {
        destructible.durable('conduit', Conduit, shifter, outbox, connection, 'connect', async())
    }, function (conduit) {
        destructible.destruct.wait(conduit.shifter, 'destroy')
        connection.conduit = conduit
    })
})

var discover = require('./discover')
var embark = require('./embark')
var recoverable = require('./recoverable')

function Connection (destructible, colleague, ua) {
    this.destructible = destructible
    this.colleague = colleague
    this.ua = ua
    this.destroyed = false
    destructible.destruct.wait(this, function () { this.destroyed = true })
}

Connection.prototype.connect = cadence(function (async, envelope, inbox, outbox) {
    var ua = this.colleague._ua
    switch (envelope.method) {
    case 'ready':
        this.outbox = outbox
        this.id = envelope.registration.id
        this.island = envelope.registration.island
        this.properties = coalesce(envelope.registration.properties, {})
        this.destructible.context.push(this.island, this.id, this.properties)
        this.destructible.durable('inbox', inbox.pump(this, 'receive'), 'destructible', null)
        this.colleague.outbox = outbox
        this.kibitzer = new Kibitzer({
            id: this.id,
            ping: this.colleague._ping.paxos,
            timeout: this.colleague._timeout.paxos,
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
        this.destructible.durable('pinged', this.kibitzer.paxos.pinged.pump(this, function (envelope) {
            if (envelope == null) {
                return
            }
            this.colleague.scheduler.schedule(Date.now() + this.colleague._timeout.chaperon, Keyify.stringify({
                island: this.island,
                id: this.id
            }), {
                name: 'recoverable',
                island: this.island,
                id: this.id
            })
        }), 'destructible', null)
        this.destructible.destruct.wait(this, function () {
            var colleague = this.colleague.colleagues.island[this.island][this.id]
            delete this.colleague.colleagues.island[this.island][this.id]
        })
        this.destructible.destruct.wait(this, function () {
            this.colleague.scheduler.unschedule(Keyify.stringify({ island: this.island, id: this.id }))
        })
        this.destructible.durable('entries', this.kibitzer.paxos.log.pump(this, 'entry'), 'destructible', null)
        async(function () {
            this.destructible.durable('kibitzer', this.kibitzer, 'listen', async())
        }, function () {
            this.destructible.durable('record', this.colleague, '_record', this.kibitzer, this.id, async())
        }, function () {
            this.colleague.scheduler.schedule(Date.now(), Keyify.stringify({
                island: this.island,
                id: this.id
            }), {
                name: 'discover',
                island: this.island,
                id: this.id
            })
            outbox.push({
                method: 'ready',
                island: this.island,
                id: this.id,
                properties: this.properties
            })
            if (this.colleague.colleagues.island[this.island] == null) {
                this.colleague.colleagues.island[this.island] = {}
            }
            this.colleague.colleagues.island[this.island][this.id] = this
            this.createdAt = Date.now()
        })
        break
    case 'broadcasts':
        var government = this.kibitzer.paxos.government
        var leaderUrl = government.properties[government.majority[0]].url
        ua.fetch({
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
            ua.fetch({
                url: leaderUrl
            }, {
                url: './snapshot',
                post: { promise: envelope.promise },
                raise: true,
                parse: 'stream'
            }, async())
        }, function (stream, response) {
            var reader = new Reader(outbox, stream)
            async(function () {
                reader.read(async())
            }, function () {
                reader.raise()
                return []
            })
        })
        break
    }
})

Connection.prototype.entry = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this.outbox.push({ method: 'entry', body: envelope })
})

Connection.prototype.receive = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    switch (envelope.method) {
    case 'acclimate':
        this.kibitzer.acclimate()
        return []
    case 'broadcast':
    case 'reduce':
        this.kibitzer.publish(envelope)
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
        action = embark(members, envelope.body.republic)
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
        colleague.kibitzer.bootstrap(Date.now(), properties)
        break
    case 'join':
        colleague.kibitzer.join(action.republic)
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
        this._destructible.destroy()
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

Local.prototype.connect = cadence(function (async, inbox, outbox) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    this._destructible.ephemeral([ 'colleague', this._instance++ ], this, '_connect', inbox, outbox, async())
})

module.exports = Local
