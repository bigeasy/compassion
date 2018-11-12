var cadence = require('cadence')
var Interrupt = require('interrupt').createInterrupter('compassion.conference')
var Procession = require('procession')
var Monotonic = require('monotonic').asString
var assert = require('assert')
var UserAgent = require('vizsla')
var coalesce = require('extant')
var Cubbyhole = require('cubbyhole')
var rescue = require('rescue/redux')

var Multiplexer = require('conduit/multiplexer')
var Conduit = require('conduit/conduit')

var Turnstile = require('turnstile')
Turnstile.Queue = require('turnstile/queue')

function Conference (destructible, inbox, outbox, application, replaying, callback) {
    this._application = application
    this._destructible = destructible
    this.log = new Procession
    this.events = new Procession
    this.consumed = new Procession
    this._government = null
    this.outbox = new Procession
    this._replaying = !! replaying
    this._cookie = '0'
    this._snapshots = new Cubbyhole
    this._postbacks = { reduced: {}, receive: {} }
    this._broadcasts = {}
    this._snapshot = new Procession
    this._backlog = new Procession
    this._turnstile = new Turnstile
    this._entries = new Turnstile.Queue(this, '_entry', this._turnstile)
    this._destructible = destructible
    this._initialize(destructible, inbox, outbox, callback)
}

Conference.prototype._initialize = cadence(function (async, destructible, inbox, outbox) {
    async(function () {
        destructible.monitor('conduit', Conduit, inbox, outbox, this, 'connect', async())
    }, function (conduit) {
        this._conduit = conduit
        return this
    })
})

Conference.prototype.ready = cadence(function (async) {
    var request = this._conduit.connect({ method: 'ready', inbox: true, outbox: true })
    this._outbox = request.outbox
    async(function () {
        request.inbox.dequeue(async())
    }, function (envelope) {
        assert(envelope.method == 'ready')
        this.id = envelope.id
        this.island = envelope.island
        this.properties = envelope.properties
        this._destructible.monitor('inbox', request.inbox.pump(this, 'receive'), 'destructible', null)
    })
})

Conference.prototype.connect = cadence(function (async, request, inbox, outbox) {
    switch (request.method) {
    case 'broadcasts':
        this._snapshots.wait(request.promise, async())
        break
    case 'snapshot':
        this._application.snapshot(outbox, async())
        break
    }
})

Conference.prototype.receive = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    switch (envelope.method) {
    case 'entry':
        this._entries.push(envelope.body)
        break
    }
})

Conference.prototype._entry = cadence(function (async, envelope) {
    var entry = envelope.body
    if (entry == null) {
        return
    }
    this.events.push({ type: 'entry', id: this.id, body: envelope.body })
    assert(entry != null)
    this.log.push(entry)
    async(function () {
        if (entry.method == 'government') {
            this._government = entry.government
            var properties = entry.properties
            async(function () {
                if (entry.body.arrive) {
                    var arrival = entry.body.arrive
                    async(function () {
                        if (entry.body.promise == '1/0') {
                            this._application.dispatch({
                                method: 'bootstrap',
                                self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                                entry: entry.body,
                                replaying: this._replaying,
                                government: this._government
                            }, async())
                        } else if (arrival.id == this.id) {
                            var request = this._conduit.connect({
                                method: 'snapshot',
                                promise: this._government.promise,
                                inbox: true
                            })
                            this._destructible.monitor('snapshot', true, request.inbox.pump(this, function (envelope) {
                                this.events.push({ type: 'snapshot', id: this.id, body: envelope })
                            }), 'destructible', null)
                            this._application.dispatch({
                                method: 'join',
                                self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                                entry: entry.body,
                                replaying: this._replaying,
                                government: this._government,
                                snapshot: request.inbox
                            }, async())
                        }
                    }, function () {
                        this._application.dispatch({
                            method: 'arrive',
                            self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                            entry: entry.body,
                            replaying: this._replaying,
                            government: this._government
                        }, async())
                    }, function () {
                        if (arrival.id != this.id) {
                            var broadcasts = []
                            for (var key in this._broadcasts) {
                                broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                            }
                            this._snapshots.set(this._government.promise, null, broadcasts)
                        } else if (this._government.promise != '1/0') {
                            async(function () {
                                this._conduit.connect({
                                    method: 'broadcasts',
                                    promise: this._government.promise
                                }).inbox.dequeue(async())
                                // Uncomment to trigger the assertion below.
                                // this._destructible.destroy()
                            }, function (body) {
                                // TODO Would be nice to throw a particular
                                // type of message and have it logged as a
                                // warning and not an error, so use `Rescue`
                                // to filter out anything that is just a
                                // warning or caused by some expected event,
                                // then spare ourselves the stack trace or
                                // have it programatically marked as a
                                // warning and not a fatal exception.
                                //
                                // But, this is going to be rare. It means
                                // crashing at startup which means there are
                                // programatic errors afoot. This would be
                                // part of the mess that gets reporting in
                                // the exception bouquet and hopfully it
                                // would be seen as a symptom and not a
                                // cause. Maybe these comments will help.
                                Interrupt.assert(body != null, 'disconnected', { level: 'warn' })
                                this.events.push({ type: 'broadcasts', id: this.id, body: body })
                                async.forEach(function (broadcast) {
                                    async(function () {
                                        this._entry({
                                            body: { // turnstile
                                                body: { // paxos
                                                    body: { // islander
                                                        module: 'conference',
                                                        method: 'broadcast',
                                                        internal: broadcast.internal,
                                                        request: {
                                                            key: broadcast.key,
                                                            method: broadcast.method,
                                                            body: broadcast.body
                                                        }
                                                    }
                                                }
                                            }
                                        }, async())
                                    }, function () {
                                        async.forEach(function (promise) {
                                            this._entry({
                                                body: { // turnstile
                                                    body: { // paxos
                                                        body: { // islander
                                                            module: 'conference',
                                                            method: 'reduce',
                                                            reduction: {
                                                                from: promise,
                                                                key: broadcast.key,
                                                                body: broadcast.responses[promise]
                                                            }
                                                        }
                                                    }
                                                }
                                            }, async())
                                        })(Object.keys(broadcast.responses))
                                    })
                                })(body)
                            })
                        }
                    })
                } else if (entry.body.departed) {
                    async(function () {
                        this._application.dispatch({
                            self: {
                                id: this.id,
                                arrived: this._government.arrived.promise[this.id]
                            },
                            method: 'depart',
                            body: entry.body,
                            replaying: this._replaying,
                            government: this._government
                        }, async())
                    }, function () {
                        var depart = entry.body.departed
                        var promise = depart.promise
                        var broadcasts = []
                        for (var key in this._broadcasts) {
                            delete this._broadcasts[key].responses[promise]
                            broadcasts.push(this._broadcasts[key])
                        }
                        this._snapshots.remove(promise)
                        async.forEach(function (broadcast) {
                            this._checkReduced(broadcast, async())
                        })(broadcasts)
                    })
                }
            }, function () {
                if (entry.body.acclimate != null) {
                    this._application.dispatch({
                        self: {
                            id: this.id,
                            arrived: this._government.arrived.promise[this.id]
                        },
                        method: 'acclimated',
                        body: entry.body,
                        replaying: this._replaying,
                        government: this._government
                    }, async())
                }
            }, function () {
                this._application.dispatch({
                    self: {
                        id: this.id,
                        arrived: this._government.arrived.promise[this.id]
                    },
                    method: 'government',
                    body: entry.body,
                    replaying: this._replaying,
                    government: this._government
                }, async())
            }, function () {
                this._outbox.push({
                    module: 'compassion',
                    method: 'acclimate',
                    body: null
                })
            })
        } else {
            // Bombs on a flush!
            assert(entry.body.body)
            // Reminder that if you ever want to do queued instead async then the
            // queue should be external and a property of the object the conference
            // operates.

            //
            var envelope = entry.body.body
            switch (envelope.method) {
            case 'broadcast':
                this._broadcasts[envelope.request.key] = {
                    key: envelope.request.key,
                    internal: coalesce(envelope.internal, false),
                    from: envelope.request.from,
                    method: envelope.request.method,
                    body: envelope.request.body,
                    responses: {}
                }
                async(function () {
                    this._application.dispatch({
                        self: {
                            id: this.id,
                            arrived: this._government.arrived.promise[this.id]
                        },
                        method: 'receive',
                        from: envelope.request.from,
                        replaying: this._replaying,
                        government: this._government,
                        body: envelope.request.body
                    }, async())
                }, function (response) {
                    this._outbox.push({
                        module: 'compassion',
                        method: 'reduce',
                        reduction: {
                            key: envelope.request.key,
                            from: this._government.arrived.promise[this.id],
                            body: coalesce(response)
                        }
                    })
                })
                break
            // Tally our responses and if they match the number of participants,
            // then invoke the reduction method.
            case 'reduce':
                var broadcast = this._broadcasts[envelope.reduction.key]
                broadcast.responses[envelope.reduction.from] = envelope.reduction.body
                this._checkReduced(broadcast, async())
                break
            }
        }
    }, function () {
        if (this._replaying) {
            this._outbox.push({
                module: 'compassion',
                method: 'consumed',
                promise: entry.promise,
                body: null
            })
        }
    })
})

Conference.prototype._checkReduced = cadence(function (async, broadcast) {
    var complete = true
    for (var promise in this._government.arrived.id) {
        if (!(promise in broadcast.responses)) {
            complete = false
            break
        }
    }

    if (complete) {
        var reduced = []
        for (var promise in broadcast.responses) {
            reduced.push({
                promise: promise,
                id: this._government.arrived.id[promise],
                value: broadcast.responses[promise]
            })
        }
        // We provide both the id and arrived promise of the member that
        // initiated the request. We need to do this becaause the broadcast
        // could have been initiated by a member that has since departed so we
        // would not be able to derived id from arrived promise nor vice-versa.
        //
        // Unlike the request, the response does not need to provide the
        // `reduced` postback with both the id and the arrived promise because
        // the only responses provided are those that are still present in the
        // government at the time of this postback.
        this._application.dispatch({
            self: {
                id: this.id,
                arrived: this._government.arrived.promise[this.id]
            },
            method: 'reduced',
            from: broadcast.from,
            replaying: this._replaying,
            government: this._government,
            request: broadcast.body,
            arrayed: reduced,
            mapped: broadcast.responses
        }, async())
        delete this._broadcasts[broadcast.key]
    }
})

Conference.prototype.broadcast = function (method, message) {
    var cookie = this._nextCookie()
    var uniqueId = this._government.arrived.promise[this.id]
    var key = method + '[' + uniqueId + '](' + cookie + ')'
    this._outbox.push({
        module: 'conference',
        method: 'broadcast',
        request: {
            key: key,
            from: { id: this.id, arrived: this._government.arrived.promise[this.id] },
            method: method,
            body: message
        }
    })
}

Conference.prototype._nextCookie = function () {
    return this._cookie = Monotonic.increment(this._cookie, 0)
}

module.exports = cadence(function (async, destructible, inbox, outbox, application, replaying) {
    new Conference(destructible, inbox, outbox, application, replaying, async())
})
