var cadence = require('cadence')
var Vizsla = require('vizsla')
var logger = require('prolific.logger').createLogger('compassion.colleague')

var Kibitzer = require('kibitz')

var crypto = require('crypto')

var Monotonic = require('monotonic').asString

// Sencha Connect middleware builder.
var Reactor = require('reactor')

var url = require('url')

var Procession = require('procession')

var coalesce = require('extant')

var Timer = require('happenstance/timer')
var Scheduler = require('happenstance/scheduler')

var Keyify = require('keyify')

var Recorder = require('./recorder')

var Backlogger = require('./backlogger')

function Local (destructible, pinger, colleagues, options) {
    this._destructible = destructible

    this._pinger = pinger

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
    destructible.destruct.wait(timer.events.pump(this, '_scheduled', destructible.monitor('timer')), 'destroy')
    destructible.destruct.wait(scheduler.events.pump(timer, 'enqueue', destructible.monitor('scheduler')), 'destroy')

    this.scheduler = scheduler

    this._instance = 0
    this._ua = new Vizsla

    this.events = new Procession

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

Local.prototype._record = cadence(function (async, destructible, kibitzer, id) {
    destructible.destruct.wait(kibitzer.played.pump(new Recorder(this.events, id, 'kibitzer'), 'record', destructible.monitor('played')), 'destroy')
    destructible.destruct.wait(kibitzer.paxos.outbox.pump(new Recorder(this.events, id, 'paxos'), 'record', destructible.monitor('paxos')), 'destroy')
    destructible.destruct.wait(kibitzer.islander.outbox.pump(new Recorder(this.events, id, 'islander'), 'record', destructible.monitor('islander')), 'destroy')
    return kibitzer
})

Local.prototype.colleague = cadence(function (async, destructible, envelope) {
    var kibitzer
    async(function () {
        var ua = new Vizsla().bind({ timeout: this._timeout.http })
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
        async(function () {
            crypto.randomBytes(32, async())
        }, function (bytes) {
            if (this.colleagues.island[envelope.island] == null) {
                this.colleagues.island[envelope.island] = {}
            }
            var events = this.events
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
                            id: colleague.initalizer.id,
                            body: body
                        })
                        return [ body ]
                    })
                })
            }, envelope, kibitzer)
            conference.log.pump(new Recorder(this.events, envelope.id, 'entry'), 'record', destructible.monitor('log'))
            destructible.destruct.wait(function () { conference.log.push(null) })
            conference.consumed.pump(new Recorder(this.events, envelope.id, 'consumed'), 'record', destructible.monitor('consumed'))
            destructible.destruct.wait(function () { conference.consumed.push(null) })
            var log = kibitzer.paxos.log.pump(conference, 'entry', destructible.monitor('entries'))
            destructible.destruct.wait(log, 'destroy')
            // kibitzer.paxos.log.pump(new Recorder(this.events, envelope.id, 'entry'), 'record', destructible.monitor('events'))
            destructible.destruct.wait(kibitzer.paxos.pinged.pump(this, function () {
                this.scheduler.schedule(Date.now() + this._timeout.chaperon, Keyify.stringify({
                    island: envelope.island,
                    id: envelope.id
                }), {
                    name: 'recoverable',
                    island: envelope.island,
                    id: envelope.id
                })
            }, destructible.monitor('pinged')), 'destroy')
            destructible.destruct.wait(this, function () {
                var colleague = this.colleagues.island[envelope.island][envelope.id]
                delete this.colleagues.island[envelope.island][envelope.id]
                delete this.colleagues.token[colleague.token]
            })
            destructible.destruct.wait(function () {
                conference.outbox.push(null)
            })
            destructible.destruct.wait(this, function () {
                this.scheduler.unschedule(Keyify.stringify({
                    island: envelope.island,
                    id: envelope.id
                }))
            })
            destructible.destruct.wait(this, function () {
                this._pinger.clear(envelope.url)
            })
            this._pinger.keepAlive(envelope.url, envelope.token, destructible)
            var token = bytes.toString('hex')
            var colleague = this.colleagues.island[envelope.island][envelope.id] = {
                token: token,
                destructible: destructible,
                initalizer: envelope,
                kibitzer: kibitzer,
                conference: conference,
                createdAt: Date.now(),
                destroyed: false,
                ua: new Vizsla().bind({
                    url: envelope.url,
                    raise: true,
                    parse: 'json'
                })
            }
            destructible.markDestroyed(colleague)
            this.colleagues.token[token] = colleague
            this.scheduler.schedule(Date.now(), Keyify.stringify({
                island: colleague.initalizer.island,
                id: colleague.initalizer.id
            }), {
                name: 'register',
                island: colleague.initalizer.island,
                id: colleague.initalizer.id
            })
            return []
        })
    })
})

var discover = require('./discover')
var embark = require('./embark')
var recoverable = require('./recoverable')

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

Local.prototype._overwatch = cadence(function (async, colleague, envelope, members, complete) {
    var action
    switch (envelope.body.name) {
    case 'register':
        action = { action: 'register' }
        break
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
    switch (action.action) {
    case 'register':
        async(function () {
            this._ua.fetch({
                url: colleague.initalizer.url,
                token: colleague.initalizer.token,
                timeout: this._timeout.http,
                parse: 'dump'
            }, {
                url: './register',
                post: {
                    token: colleague.token
                }
            }, async())
        }, function (body, response) {
            if (response.okay) {
                this.scheduler.schedule(Date.now(), Keyify.stringify({
                    island: envelope.body.island,
                    id: envelope.body.id
                }), {
                    name: 'discover',
                    island: envelope.body.island,
                    id: envelope.body.id
                })
            } else {
                colleague.destructible.destroy()
            }
        })
        break
    case 'bootstrap':
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.initalizer.properties, {})))
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
        var properties = JSON.parse(JSON.stringify(coalesce(colleague.initalizer.properties, {})))
        properties.url = envelope.body.url
        this._ua.fetch({
            url: action.url,
            timeout: this._timeout.http,
            nullify: true,
            parse: 'json'
        }, {
            url: './arrive',
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
    var colleague = this._getColleagueByIslandAndId(envelope.body.island, envelope.body.id)
    async(function () {
        this._population.census(envelope.body.island, async())
    }, function (members, complete) {
        if (!colleague.destroyed) {
            this._overwatch(colleague, envelope, members, complete, async())
        }
    })
})

Local.prototype._getColleagueByToken = function (request) {
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
    var colleague = this._getColleagueByToken(request)
    var government = colleague.kibitzer.paxos.government
    async(function () {
        colleague.ua.fetch({
            url: government.properties[government.majority[0]].url
        }, {
            url: './backlog',
            post: {
                promise: government.arrived.promise[colleague.initalizer.id]
            },
            parse: 'stream',
            raise: true
        }, async())
    }, function (body, response) {
        return [ 200, response.headers, Backlogger({
            events: this.events,
            id: colleague.initalizer.id,
            contentType: response.headers['content-type'],
            input: body
        }) ]
    })
})

Local.prototype.register = cadence(function (async, request) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    async(function () {
        this._destructible.monitor([ 'colleague', this._instance++ ], true, this, 'colleague', request.body, async())
    }, function () {
        return 200
    })
})

Local.prototype.record = cadence(function (async, request) {
    var colleague = this._getColleagueByToken(request)
    this.events.push({
        type: 'record',
        id: colleague.initalizer.id,
        body: request.body
    })
    return request.body
})

Local.prototype.broadcast = cadence(function (async, request) {
    var colleague = this._getColleagueByToken(request)
    colleague.conference.broadcast(request.body.method, request.body.message)
    return 200
})

module.exports = Local
