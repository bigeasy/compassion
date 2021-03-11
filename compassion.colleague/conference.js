// Node.js API.
const assert = require('assert')

// Exceptions that report nested exceptions that you can catch by type.
const { Interrupt } = require('interrupt')

// An `async`/`await` in-process message queue.
const { Queue } = require('avenue')

// An `async`/`await` socket multiplexer.
const Conduit = require('conduit')

// Like SQL COALESCE, return the first defined value.
const { coalesce } = require('extant')

// An `async`/`await` map of future values.
const Cubbyhole = require('cubbyhole')

const eject = require('once')

// Whenever you see this, you want to refactor it so that initialization takes
// place in the constructor, with the constructor accepting the first entry,
// snapshot and backlog of broadcasts. Don't do it. This of this as a state
// machine and the iniital state is waiting for an entry. Construction is not
// about initializing the application, it's about hooking up all the message
// plumbing which is already a challenge. You don't want to introduce what is
// essentially a factory object or function.

// It's in for a penny, in for a pound. That is why there is an initialize
// function which you're going to hate because you're going to imagine the
// GitHub Issues filling up with Redditors clucking like wet hens about
// immutability, but this code is righteous and pure.

//
class Conference {
    static Error = Interrupt.create('compassion.conference', {
    })
    // Construct a `Conference`.

    //
    constructor (destructible, { id, entry, log, ua, consumer, replaying = false }) {
        // A bouquet of `Promise`s monitored by this `Conference` instance.
        this.destructible = destructible

        this.id = id

        this._ua = ua

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

        // All messages are broadcast, so maybe we rename this.
        this._broadcasts = {}

        this._cubbyholes = { snapshots: new Cubbyhole, broadcasts: new Cubbyhole }

        // Mark ourselves as destroyed on destruction.
        this.destructible.destruct(() => this.destroyed = true)

        // Outbound messages.
        this.messages = new Queue()

        // **TODO** Let the messages swim to exit. Why? We're leaving. The log
        // is supposed to just truncate anyway.
        destructible.destruct(() => log.destroy())

        // Construct our application passing ourselves as the first argument.
        this.application = consumer

        this.application.initialize(this)

        this.destructible.ephemeral('consume', async () => {
            for await (const entry of log.iterator()) {
                await this._entry(entry)
            }
        })
    }

    enqueue (body) {
        const cookie = (this._cookie = BigInt(this._cookie) + 1n).toString(16)
        const arrived = this._government.arrived.promise[this.id]
        this.messages.push({
            republic: this._government.republic,
            body: {
                module:   'conference',
                method:   'broadcast',
                key:      '[' + arrived + '](' + cookie + ')',
                from:     { id: this.id, arrived: this._government.arrived.promise[this.id] },
                body:     body
            }
        })
    }

    async _arrive (entry, broadcasts, snapshot) {
        this._government = entry.government
        if (entry.body.promise == '1/0') {
            this.consumer.bootstrap()
        } else {
            this.consumer.arrive(snapshot)
        }
    }

    async _entry (entry, queue, broadcast) {
        Conference.Error.assert(entry != null, 'entry eos')
        console.log('entry', entry)
        this.events.push({ type: 'entry', id: this.id, entry })
        this.log.push(entry)
        if (entry.method == 'government') {
            this._government = entry.government
            var properties = entry.properties
            if (entry.body.arrive) {
                var arrival = entry.body.arrive
                console.log('>>>>', entry.body.promise)
                if (entry.body.promise == '1/0') {
                    await this.application.bootstrap()
                } else if (arrival.id == this.id) {
                    const subDestructible = this.destructible.ephemeral('snapshot')
                    const leader          = this._government.properties[this._government.majority[0]].url
                    const promise         = this._government.promise
                    const stream          = await this._ua.stream(leader, './snapshot', { promise })
                    const staccato        = new Staccato(stream)
                    const snapshot        = new Queue().shifter().paired
                    // TODO destructible.error() ?
                    subDestructible.durable('stream', async () => {
                        const errors = []
                        stream.on('error', errors.push.bind(errors))
                        await new Promise(resolve => stream.once('close', resolve))
                        Compassion.Error.assert(errors.length == 0, 'SNAPSHOT_STREAM_ERROR', errors)
                    })
                    // TODO CRC32 or FNV.
                    subDestructible.durable('
                    const player = new Player(function () { return '0' })
                    for await (const buffer of staccato.readable) {
                        for (const message of player.split(buffer)) {
                            const json = JSON.parse(entry.parts.shift())
                            snapshot.queue.push(json)
                        }
                    }
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
                await this.application.arrive({
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    arrival: entry.body,
                    replaying: this._replaying,
                    government: this._government
                })
                if (arrival.id != this.id) {
                    const broadcasts = []
                    for (const key in this._broadcasts) {
                        broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                    }
                    this._cubbyholes.broadcasts.resolve(this._government.promise, broadcasts)
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
                }
                this._cubbyholes.snapshots.resolve(entry.promise, true)
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
                await this.application.acclimated({
                    promise: entry.body.promise,
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
            // TODO Is this necessary?
            /*
            await this.application.government({
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
            */
        } else {
            // Bombs on a flush!
            assert(entry.body.body)
            // Reminder that if you ever want to do queued instead async then the
            // queue should be external and a property of the object the conference
            // operates.

            //
            const envelope = entry.body
            switch (envelope.method) {
            case 'broadcast':
                const request = envelope.request
                this._broadcasts[envelope.key] = {
                    key: envelope.key,
                    from: envelope.from,
                    method: envelope.method,
                    body: envelope.body,
                    responses: {}
                }
                const response = await this.application.map({
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    method: 'receive',
                    from: envelope.from,
                    replaying: this._replaying,
                    government: this._government,
                    body: envelope.body
                })
                this.messages.push({
                    republic: this._government.republic,
                    body: {
                        module: 'compassion',
                        method: 'reduce',
                        key: envelope.key,
                        from: this._government.arrived.promise[this.id],
                        body: coalesce(response)
                    }
                })
                break
            // Tally our responses and if they match the number of participants,
            // then invoke the reduction method.
            case 'reduce':
                var broadcast = this._broadcasts[envelope.key]
                broadcast.responses[envelope.from] = envelope.body
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

        // Feel like all ids should just be hidden from the user, but I dunno,
        // simplified? Maybe the user is doing some sort of system management
        // and address properties of paxos are meaningful?
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
        await this.application.reduce({
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
