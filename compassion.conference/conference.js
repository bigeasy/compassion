// Node.js API.
const assert = require('assert')

// Exceptions that report nested exceptions that you can catch by type.
const Interrupt = require('interrupt').create('compassion.conference')

// An `async`/`await` in-process message queue.
const Queue = require('avenue')

// An `async`/`await` socket multiplexer.
const Conduit = require('conduit')

// Like SQL COALESCE, return the first defined value.
const coalesce = require('extant')

// An `async`/`await` map of future values.
const Cubbyhole = require('cubbyhole')

// **TODO** Tempted to make this a connection object and make `Conference` a
// sub-object of the connection. Avoiding this for now to prevent too much
// refactoring at once. Not certain that I'll want to do it when everything is
// working. Not loving the names of these things any longer, either.
//
// Might want to make this a `Compassion` object so that the names are not all
// over the place. I've already replacing `broadcast` with `enqueue`. The next
// refactor will reduce the number of objects in this architecture. The primary
// change is removing HTTP as a layer and requiring communication to go through
// `Conduit`s. If we want an HTTP layer, we can build it at a different layer,
// but we're probably going to build a key/value store and service mesh with
// this library and it will not expose a raw interface to the atomic log.

//
class Conference {
    // Construct a `Conference`.

    //
    constructor (destructible, conduit, application, island, id, properties, replaying = false) {
        // A bouquet of `Promise`s monitored by this `Conference` instance.
        this._destructible = destructible

        this.id = id

        // The Paxos event log.
        this.log = new Queue

        // Network events received by this `Conference` instance.
        this.events = new Queue

        // Network events consumed by this `Conference` instance.
        this.consumed = new Queue

        // Whether or not this `Conference` instance has destructed.
        this.destroyed = false

        // Current Paxos government.
        this._government = null

        // Whether or not we are replaying a captured log of network events.
        this._replaying = !! replaying

        // Previous embarkation cookie used to create next cookie.
        this._cookie = -1

        // Map of promises to initialization snapshots.
        this._snapshots = new Cubbyhole

        // All messages are broadcast, so maybe we rename this.
        this._broadcasts = {}

        this._cubbyholes = { snapshots: new Cubbyhole, broadcasts: new Cubbyhole }

        // Mark ourselves as destroyed on destruction.
        this._destructible.destruct(() => this.destroyed = true)

        // Open a new connection to the colleague.
        const { shifter, queue } = conduit.queue({})

        // Start a `Conduit` around the colleague connection.
        this._conduit = new Conduit(destructible.durable('conduit'), shifter, queue, this._request.bind(this))

        // Connect to `Colleague` via our `Conduit`.
        const request = this._conduit.queue({ method: 'connect', island, id, properties })

        // Note the queue for use with `enqueue`.
        this._queue = request.queue

        // Read responses from the conduit
        destructible.durable('shift', async () => {
            for await (const entry of request.shifter.iterator()) {
                await this._entry(entry)
            }
            this._ready.call(null, false)
        })

        // **TODO** Let the messages swim to exit.
        destructible.destruct(() => request.shifter.destroy())

        // A promise that resolves to true when ready.
        this.ready = new Promise(resolve => this._ready = resolve)

        // Construct our application passing ourselves as the first argument.
        this.application = application
    }

    enqueue (method, message) {
        const cookie = (this._cookie = BigInt(this._cookie) + 1n).toString(16)
        const arrived = this._government.arrived.promise[this.id]
        this._queue.push({
            module: 'conference',
            method: 'broadcast',
            request: {
                key: '[' + arrived + '](' + cookie + ')',
                from: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                method: method,
                body: message
            }
        })
    }

    destroy () {
        this._destructible.destroy()
    }

    async _request (request, queue) {
        // **TODO** Here we await the arrival of the requested promise so that
        // we can snapshot the backlog and the user can snapshot their
        // application state for a snapshot request.
        switch (request.method) {
        case 'broadcasts':
            return await this._cubbyholes.broadcasts.get(request.promise)
        case 'snapshot':
            await this._cubbyholes.snapshots.get(request.promise)
            // TODO Maybe queue can be null and we just return something.
            await this.application.snapshot(request.promise, queue)
            break
        }
    }

    async _entry (entry, queue, broadcast) {
        Interrupt.assert(entry != null, 'entry eos')
        this.events.push({ type: 'entry', id: this.id, entry })
        this.log.push(entry)
        if (entry.method == 'government') {
            this._government = entry.government
            var properties = entry.properties
            if (entry.body.arrive) {
                var arrival = entry.body.arrive
                if (entry.body.promise == '1/0') {
                    await this.application.dispatch({
                        method: 'bootstrap',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        entry: entry.body,
                        replaying: this._replaying,
                        government: this._government
                    })
                } else if (arrival.id == this.id) {
                    const { shifter } = this._conduit.shifter({
                        method: 'snapshot',
                        promise: this._government.promise
                    })
                    this._destructible.ephemeral('snapshot', shifter.shifter().pump(body => {
                        return this.events.push({ type: 'snapshot', id: this.id, body })
                    }))
                    await this.application.dispatch({
                        method: 'join',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        entry: entry.body,
                        replaying: this._replaying,
                        government: this._government
                    }, shifter)
                }
                await this.application.dispatch({
                    method: 'arrive',
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    entry: entry.body,
                    replaying: this._replaying,
                    government: this._government
                })
                if (arrival.id != this.id) {
                    const broadcasts = []
                    for (const key in this._broadcasts) {
                        broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                    }
                    this._cubbyholes.broadcasts.set(this._government.promise, broadcasts)
                } else if (this._government.promise != '1/0') {
                    const broadcasts = await this._conduit.invoke({
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
                    Interrupt.assert(broadcasts != null, 'disconnected', { level: 'warn' })
                    this.events.push({ type: 'broadcasts', id: this.id, broadcasts })
                    for (const broadcast of broadcasts) {
                        await this._entry({
                            body: {
                                body: { // islander
                                    module: 'conference',
                                    method: 'broadcast',
                                    request: {
                                        key: broadcast.key,
                                        method: broadcast.method,
                                        body: broadcast.body
                                    }
                                }
                            }
                        })
                        for (const promise in broadcast.responses) {
                            await this._entry({
                                body: {
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
                            })
                        }
                    }
                    this._ready.call(null, true)
                } else {
                    console.log('!!!! did not become ready')
                    this._ready.call(null, false)
                }
                // **TODO** Throw an exception here and determine why this fails
                // siletly.
                this._cubbyholes.snapshots.set(entry.promise, true)
            } else if (entry.body.departed) {
                await this.application.dispatch({
                    self: {
                        id: this.id,
                        arrived: this._government.arrived.promise[this.id]
                    },
                    method: 'depart',
                    body: entry.body,
                    replaying: this._replaying,
                    government: this._government
                })
                var depart = entry.body.departed
                var promise = depart.promise
                var broadcasts = []
                for (var key in this._broadcasts) {
                    delete this._broadcasts[key].responses[promise]
                    broadcasts.push(this._broadcasts[key])
                }
                this._snapshots.remove(promise)
                for (const broadcast of broadcasts) {
                    await this._checkReduced(broadcast)
                }
            }
            if (entry.body.acclimate != null) {
                await this.application.dispatch({
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
            await this.application.dispatch({
                self: {
                    id: this.id,
                    arrived: this._government.arrived.promise[this.id]
                },
                method: 'government',
                body: entry.body,
                replaying: this._replaying,
                government: this._government
            })
            this._queue.push({
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
            const envelope = entry.body.body
            switch (envelope.method) {
            case 'broadcast':
                const request = envelope.request
                this._broadcasts[request.key] = {
                    key: request.key,
                    from: request.from,
                    method: request.method,
                    body: request.body,
                    responses: {}
                }
                const response = await this.application.dispatch({
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    method: 'receive',
                    from: request.from,
                    replaying: this._replaying,
                    government: this._government,
                    body: request.body
                })
                this._queue.push({
                    module: 'compassion',
                    method: 'reduce',
                    reduction: {
                        key: request.key,
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
                await this._checkReduced(broadcast)
                break
            }
        }
        if (this._replaying) {
            this._queue.push({
                module: 'compassion',
                method: 'consumed',
                promise: entry.promise,
                body: null
            })
        }
        this.consumed.push(entry)
    }

    async _checkReduced (broadcast) {
        for (const promise in this._government.arrived.id) {
            if (!(promise in broadcast.responses)) {
                return
            }
        }

        const reduced = []
        for (const promise in broadcast.responses) {
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
        await this.application.dispatch({
            self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
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

module.exports = Conference
