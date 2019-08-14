var assert = require('assert')

var Interrupt = require('interrupt').create('compassion.conference')

var Avenue = require('avenue')

var Monotonic = require('monotonic').asString

var coalesce = require('extant')

var Cubbyhole = require('cubbyhole')

const { default: Queue } = require('p-queue')

console.log('compiled?')

class Conference {
    constructor (conduit, outbox, application, replaying) {
        this._application = application
        this._destructible = destructible
        this.log = new Avenue
        this.events = new Avenue
        this.consumed = new Avenue
        this._government = null
        this._outbox = outbox
        this._replaying = !! replaying
        this._cookie = '0'
        this._snapshots = new Cubbyhole
        this._postbacks = { reduced: {}, receive: {} }
        this._broadcasts = {}
        this._snapshot = new Avenue
        this._backlog = new Avenue
        this._entries = new Queue()
        this._entries = new Turnstile.Queue(this, '_entry', this._turnstile)
        this.destroyed = false
    }

    destroy () {
        this.destroyed = true
    }

    async connect (request, inbox, outbox) {
        switch (request.method) {
        case 'broadcasts':
            return await this._cubbyhole.broadcasts.wait(request.promise)
            break
        case 'snapshot':
            await this._cubbyhole.snapshots.wait(request.promise)
            // TODO Maybe if outbox can be null and we just return something.
            await this._application.call(null, {
                method: 'snapshot',
                promise: request.promise
            }, outbox)
            break
        }
    }

    async _entry (envelope) {
        if (this.destroyed) {
            return
        }
        var entry = envelope.body
        Interrupt.assert(entry != null, 'entry eos')
        this.events.push({ type: 'entry', id: this.id, body: envelope.body })
        assert(entry != null)
        this.log.push(entry)
        if (entry.method == 'government') {
            this._government = entry.government
            var properties = entry.properties
            if (entry.body.arrive) {
                var arrival = entry.body.arrive
                if (entry.body.promise == '1/0') {
                    this._application.call(null, {
                        method: 'bootstrap',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        entry: entry.body,
                        replaying: this._replaying,
                        government: this._government
                    }, async())
                } else if (arrival.id == this.id) {
                    console.log('snapshotting!', this.id, this._government)
                    var request = this._conduit.connect({
                        method: 'snapshot',
                        promise: this._government.promise,
                        inbox: true
                    })
                    this._destructible.ephemeral('snapshot', request.inbox.pump(this, function (envelope) {
                        this.events.push({ type: 'snapshot', id: this.id, body: envelope })
                    }), 'destructible', null)
                    await this._application.call(null, {
                        method: 'join',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        entry: entry.body,
                        replaying: this._replaying,
                        government: this._government,
                        snapshot: request.inbox
                    })
                }
                await this._application.call(null, {
                    method: 'arrive',
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    entry: entry.body,
                    replaying: this._replaying,
                    government: this._government
                })
                if (arrival.id != this.id) {
                    var broadcasts = []
                    for (var key in this._broadcasts) {
                        broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                    }
                    this._snapshots.set(this._government.promise, null, broadcasts)
                } else if (this._government.promise != '1/0') {
                    const broacasts = await this._conduit.connect({
                            method: 'broadcasts',
                            promise: this._government.promise
                    })
                    // TODO Would be nice to throw a particular type of message
                    // and have it logged as a warning and not an error, so use
                    // `Rescue` to filter out anything that is just a warning or
                    // caused by some expected event, then spare ourselves the
                    // stack trace or have it programatically marked as a
                    // warning and not a fatal exception.
                    //
                    // But, this is going to be rare. It means crashing at
                    // startup which means there are programatic errors afoot.
                    // This would be part of the mess that gets reporting in the
                    // exception bouquet and hopfully it would be seen as a
                    // symptom and not a cause. Maybe these comments will help.
                    Interrupt.assert(body != null, 'disconnected', { level: 'warn' })
                    this.events.push({ type: 'broadcasts', id: this.id, body: body })
                    for (const boradcast in broadcasts) {
                        await this._entry({
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
                        })
                        for (const promise in broadcast.responses) {
                            await this._entry({
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
                            })
                        }
                    }
                }
            } else if (entry.body.departed) {
                async(function () {
                    this._application.call(null, {
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
                    async.forEach([ broadcasts ], function (broadcast) {
                        this._checkReduced(broadcast, async())
                    })
                })
            }
            if (entry.body.acclimate != null) {
                await this._application.call(null, {
                    self: {
                        id: this.id,
                        arrived: this._government.arrived.promise[this.id]
                    },
                    method: 'acclimated',
                    body: entry.body,
                    replaying: this._replaying,
                    government: this._government
                })
            }
            await this._application.call(null, {
                self: {
                    id: this.id,
                    arrived: this._government.arrived.promise[this.id]
                },
                method: 'government',
                body: entry.body,
                replaying: this._replaying,
                government: this._government
            })
            this._outbox.push({
                module: 'compassion',
                method: 'acclimate',
                body: null
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
                const response = await this._application.call(null, {
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
                this._outbox.push({
                    module: 'compassion',
                    method: 'reduce',
                    reduction: {
                        key: envelope.request.key,
                        from: this._government.arrived.promise[this.id],
                        body: coalesce(response)
                    }
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
        if (this._replaying) {
            this._outbox.push({
                module: 'compassion',
                method: 'consumed',
                promise: entry.promise,
                body: null
            })
        }
        this.consumed.push(entry)
    }

    entry (envelope) {
        this._entries.add(() => this._entry(envelope))
    }

    async _checkReduced (broadcast) {
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
            await this._application.call(null, {
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
            })
            delete this._broadcasts[broadcast.key]
        }
    }

    broadcast (method, message) {
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

    _nextCookie () {
        return this._cookie = Monotonic.increment(this._cookie, 0)
    }
}

module.exports = Conference
