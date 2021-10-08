const url = require('url')
const stream = require('stream')

const Reactor = require('reactor')
const { Timer, Scheduler } = require('happenstance')
const Kibitzer = require('kibitz')
const Keyify = require('keyify')

const ua = require('./ua')
const discover = require('./discover')
const embark = require('./embark')

// Node.js API.
const assert = require('assert')

// Exceptions that report nested exceptions that you can catch by type.
const Interrupt = require('interrupt')

// An `async`/`await` in-process message queue.
const { Queue } = require('avenue')

// Like SQL COALESCE, return the first defined value.
const { coalesce } = require('extant')

// An `async`/`await` map of future values.
const Cubbyhole = require('cubbyhole')

const Staccato = require('staccato')

const { Player, Recorder } = require('transcript')

const recorder = Recorder.create(() => '0')

const Verbatim = require('verbatim')

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
class Compassion {
    static Error = Interrupt.create('Compassion.Error', {
        SNAPSHOT_STREAM_ERROR: 'error occurred while processing snapshot stream'
    })
    // Construct a `Compassion`.

    //
    constructor (destructible, { id, entry, kibitzer, ua, consumer }) {
        // A bouquet of `Promise`s monitored by this `Compassion` instance.
        this.destructible = destructible

        this.id = id

        this._ua = ua

        // The Paxos event log.
        this.log = new Queue

        // Network events received by this `Compassion` instance.
        this.events = new Queue

        // Network events consumed by this `Compassion` instance.
        this.consumed = new Queue

        // Whether or not this `Compassion` instance has destructed.
        this.destroyed = false

        // Current Paxos government.
        this._government = null

        // Prevent calling application snapshot until after arrival.
        this.snapshots = new Cubbyhole

        // Mark ourselves as destroyed on destruction.
        this.destructible.destruct(() => this.destroyed = true)

        // Outbound messages.
        this._messages = new Queue().shifter().paired

        // **TODO** Let the messages swim to exit. Why? We're leaving. The log
        // is supposed to just truncate anyway.

        // Construct our application passing ourselves as the first argument.
        this.application = consumer

        this.application.initialize(this)

        this._kibitzer = kibitzer

        const log = kibitzer.paxos.log.shifter().async
        destructible.destruct(() => log.destroy())

        this.destructible.ephemeral('consume', async () => {
            for await (const entry of log) {
                await this._entry(entry)
            }
        })
    }

    enqueue (body) {
        this._messages.queue.push({
            module:   'compassion',
            method:   'entry',
            from:     {
                id: this.id,
                arrived: this._government.arrived.promise[this.id]
            },
            body:     body
        })
    }

    async _entry (entry, queue, broadcast) {
        Compassion.Error.assert(entry != null, 'entry eos')
        this.events.push({ type: 'entry', id: this.id, entry })
        this.log.push(entry)
        if (entry.method == 'government') {
            this._government = entry.government
            const properties = entry.properties
            // TODO What about a goverment that is neither an arrival or
            // departure? What if in the future we rebalance and change the
            // leader somehow. Governments already do change after arrival as
            // members enter the government.
            if (entry.body.arrive) {
                const arrival = entry.body.arrive
                if (entry.body.promise == '1/0') {
                    await this.application.bootstrap({
                        self: { id: this.id, arrived: this._government.arrived.promise[this. id] },
                        government: this._government
                    })
                } else if (arrival.id == this.id) {
                    const subDestructible = this.destructible.ephemeral('snapshot')
                    const leader          = this._government.properties[this._government.majority[0]].url
                    const promise         = this._government.promise
                    const stream          = await this._ua.stream(leader, './snapshot', { promise })
                    const staccato        = new Staccato(stream)
                    const snapshot        = new Queue().shifter().paired
                    // TODO destructible.error() ?
                    subDestructible.ephemeral('stream', async () => {
                        const errors = []
                        stream.on('error', errors.push.bind(errors))
                        await new Promise(resolve => stream.once('close', resolve))
                        Compassion.Error.assert(errors.length == 0, 'SNAPSHOT_STREAM_ERROR', errors)
                    })
                    // TODO CRC32 or FNV.
                    subDestructible.ephemeral('snapshot', async () => {
                        const player = new Player(function () { return '0' })
                        for await (const buffer of staccato.readable) {
                            for (const message of player.split(buffer)) {
                                snapshot.queue.push(Verbatim.deserialize(message.parts))
                            }
                        }
                        snapshot.queue.push(null)
                        subDestructible.destroy()
                    })
                    await this.application.join({
                        method: 'join',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        shifter: snapshot.shifter,
                        entry: entry.body,
                        government: this._government
                    })
                    await subDestructible.done
                }
                if (arrival.id == this.id) {
                    this.destructible.durable('enqueue', async () => {
                        for await (const message of this._messages.shifter) {
                            this._kibitzer.publish(message)
                        }
                    })
                    this.destructible.destruct(() => this._messages.shifter.destroy())
                }
                await this.application.arrive({
                    self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                    arrival: entry.body,
                    government: this._government
                })
                this.snapshots.resolve(entry.promise, true)
            } else if (entry.body.departed) {
                this.snapshots.remove(entry.body.departed.promise)
                await this.application.depart({
                    self: {
                        id: this.id,
                        arrived: this._government.arrived.promise[this.id]
                    },
                    method: 'depart',
                    body: entry.body,
                    government: this._government
                })
            } else {
                // TODO Here is where we would do an optional government change.
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
                    government: this._government
                })
            }
            this._kibitzer.paxos.acclimate()
        } else {
            // Bombs on a flush!

            // Paxos body, Islander body, Compassion body, user body.
            assert(entry.body.body.body)
            // Reminder that if you ever want to do queued instead async then the
            // queue should be external and a property of the object the conference
            // operates.

            //
            const envelope = entry.body.body
            assert.equal(envelope.method, 'entry', 'expected entry method')
            await this.application.entry({
                promise: entry.promise,
                self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                method: 'entry',
                from: envelope.from,
                government: this._government,
                entry: envelope.body
            })
        }

        this.consumed.push(entry)
    }
}

class Chaperon {

    constructor () {
        this.destructible = null
        this._applications = {}
        this._republic = Date.now()
        this._population = []
    }

    _bound (destructible, { address, port }, { applications, census }) {
        this.destructible = destructible
        this._createdAt = Date.now()
        this._applications = applications
        this._scheduler = new Scheduler
        // TODO For now, we can crash restart on unrecoverable.
        for (const application in applications) {
            const id = `${application}/${address}:${port}`
            const scheduleKey = Keyify.stringify({ application, id })
            const subDestructible = destructible.durable(`application.${application}`)
            subDestructible.destruct(() => this._scheduler.unschedule(scheduleKey))
            const kibitzer = new Kibitzer(destructible.durable('kibitz'), {
                id: id,
                // TODO Make configurable.
                ping: 1000,
                timeout: 3000,
                ua: {
                    send: async envelope => {
                        return ua.json(envelope.to.url, './kibitz', envelope)
                    }
                }
            })
            const conference = new Compassion(subDestructible.durable('conference'), {
                id: id,
                ua: ua,
                kibitzer: kibitzer,
                consumer: applications[application]
            })
            subDestructible.destruct(() => {
                kibitzer.paxos.log.push(null)
                kibitzer.paxos.pinged.push(null)
                kibitzer.paxos.outbox.push(null)
                kibitzer.played.push(null)
                kibitzer.islander.outbox.push(null)
            })
            this._applications[application] = {
                application: applications[application],
                conference:  conference,
                kibitzer:    kibitzer
            }
            this._events = new Queue
            this._scheduler.on('data', data => this._events.push(data.body))
            const timer = new Timer(this._scheduler)
            destructible.destruct(() => timer.destroy())
            destructible.destruct(() => this._scheduler.clear())
            destructible.destruct(() => this._events.push(null))
            destructible.durable('chaperon', this._chaperon(this._events.shifter()))
            const properties = applications[application].application.properties || {}
            this._scheduler.schedule(Date.now(), scheduleKey, {
                // TODO Configure location for proxies and such.
                name: 'discover', application, id, properties
            })
            destructible.durable('census', async () => {
                for await (const population of census) {
                    this._population = population
                    this._events.push({ name: 'census' })
                }
            })
        }
    }

    async _chaperon (events) {
        for await (const event of events) {
            if (event.name == 'census') {
                for (const { key, body } of this._scheduler.calendar()) {
                    this._scheduler.schedule(Date.now(), key, body)
                }
                continue
            }
            const { application, id } = event
            const islanders = []
            for (const location of this._population) {
                const islander = await ua.json(location, `./compassion/${application}/paxos`)
                if (islander != null) {
                    islanders.push({
                        id: islander.id,
                        government: islander.government,
                        cookie: islander.cookie,
                        url: url.resolve(location, `./compassion/${application}/`),
                        createdAt: this._createdAt
                    })
                }
            }
            const complete = islanders.length == this._population.length && islanders.length != 0
            const scheduleKey = Keyify.stringify({ application, id })
            let action = null
            switch (event.name) {
            case 'discover':
                action = discover(id, islanders, complete)
                break
            case 'embark':
                action = embark(islanders, event.republic, complete)
                break
            case 'recoverable':
                action = recoverable(id, islanders)
                break
            }
            switch (action.action) {
            case 'bootstrap': {
                    // **TODO** Remove defensive copy.
                    const properties = { ...event.properties, url: action.url }
                    this._applications[application].kibitzer.bootstrap(Date.now(), properties)
                }
                break
            case 'join': {
                    this._applications[application].kibitzer.join(action.republic)
                    const properties = { ...event.properties, url: action.url }
                    this._scheduler.schedule(Date.now(), scheduleKey, {
                        name: 'embark',
                        application: event.application,
                        id: event.id,
                        url: action.url,
                        republic: action.republic,
                        properties: properties
                    })
                }
                break
            case 'embark': {
                    // Schedule a subsequent embarkation. Once our Paxos object
                    // starts receiving message, the embarkation is cleared and
                    // replaced with a recoverable check.
                    this._scheduler.schedule(Date.now() + 5000 /* this._ping.chaperon */, scheduleKey, event)
                    // If this fails, we don't care. Embarkation is designed to be
                    // asynchronous in the macro. You send a message. Maybe it gets
                    // there, maybe it doesn't. You'll know when the Paxos object
                    // starts working. Until then, keep sending embarkation
                    // requests. The leader knows how to deal with duplicate or
                    // in-process requests.
                    await ua.json(action.url, './embark', {
                        republic: event.republic,
                        id: this._applications[application].kibitzer.paxos.id,
                        cookie: this._applications[application].kibitzer.paxos.cookie,
                        properties: event.properties
                    })
                }
                break
            case 'retry': {
                    this._scheduler.schedule(Date.now() + 5000 /* this._ping.chaperon */, event.key, event)
                }
                break
            case 'unrecoverable': {
                    // TODO Okay, we restart these things if we cannot recover
                    // consensus.
                    application.destructible.destroy()
                }
                break
            }
        }
    }

    async index () {
    }

    _getApplication404 (application) {
        if (! this._applications[application]) {
            throw 404
        }
        return this._applications[application]
    }

    async paxos ({ params, url }) {
        const application = this._applications[params.application]
        if (application != null) {
            return {
                id: application.kibitzer.paxos.id,
                government: application.kibitzer.paxos.government,
                cookie: coalesce(application.kibitzer.paxos.cookie),
                createdAt: application.createdAt
            }
        }
        return null
    }

    async embark ({ params: { application }, body: { id, republic, cookie, properties } }) {
        return this._getApplication404(application).kibitzer.embark(republic, id, cookie, properties)
    }

    async kibitz ({ params: { application }, body }) {
        return this._getApplication404(application).kibitzer.request(body)
    }

    async _snapshot ({ params, body: { promise } }, reply) {
        const got = this._getApplication404(params.application)
        const application = got.application
        await got.conference.snapshots.get(promise)
        const snapshot = new Queue().shifter().paired
        const subDestructible = this.destructible.ephemeral(`snapshot.send.${params.application}.${promise.replace('/', '.')}`)
        const through = new stream.PassThrough({ emitClose: true })
        subDestructible.durable('stream', async () => {
            const errors = []
            through.on('error', errors.push.bind(errors))
            await new Promise(resolve => through.once('close', resolve))
            Compassion.Error.assert(errors.length == 0, 'SNAPSHOT_STREAM_ERROR', errors)
        })
        subDestructible.durable('send', async () => {
            const staccato = new Staccato(through)
            for await (const object of snapshot.shifter) {
                await staccato.writable.write([ recorder([ Verbatim.serialize(object) ]) ])
            }
            await staccato.writable.end()
            through.destroy()
            subDestructible.destroy()
        })
        subDestructible.durable('snapshot', async () => {
            application.snapshot({ promise, queue: snapshot.queue })
            subDestructible.destroy()
        })
        reply.code(200)
        reply.header('content-type', 'application/octet-stream')
        reply.send(through)
        await subDestructible.done
        return null
    }
}

exports.listen = async function (destructible, options) {
    const compassion = new Chaperon(destructible, options)
    const reactor = new Reactor([{
        path: '/',
        method: 'get',
        f: compassion.index.bind(compassion)
    }, {
        path: '/compassion/:application/paxos',
        method: 'get',
        f: compassion.paxos.bind(compassion)
    }, {
        path: '/compassion/:application/embark',
        method: 'post',
        f: compassion.embark.bind(compassion)
    }, {
        path: '/compassion/:application/kibitz',
        method: 'post',
        f: compassion.kibitz.bind(compassion)
    }, {
        path: '/compassion/:application/snapshot',
        method: 'post',
        raw: true,
        f: compassion._snapshot.bind(compassion)
    }])
    await reactor.fastify.listen(options.bind)
    reactor.on('reply', ({ code, stack, url, path }) => {
        if (stack != null) {
            console.log(code, url, path, stack)
        } else if (Math.floor(code / 100) != 2) {
            console.log(code, url, path)
        }
    })
    destructible.destruct(() => destructible.ephemeral('close', () => reactor.fastify.close()))
    const address = reactor.fastify.server.address()
    compassion._bound(destructible, address, options)
    return address
}
