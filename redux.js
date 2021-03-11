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
const { Interrupt } = require('interrupt')

// An `async`/`await` in-process message queue.
const { Queue } = require('avenue')

// An `async`/`await` socket multiplexer.
const Conduit = require('conduit')

// Like SQL COALESCE, return the first defined value.
const { coalesce } = require('extant')

// An `async`/`await` map of future values.
const Cubbyhole = require('cubbyhole')

const { Staccato } = require('staccato')

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
class Conference {
    // Construct a `Conference`.

    //
    constructor (destructible, { id, entry, kibitzer, ua, consumer, replaying = false }) {
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

    async broadcasts (promise) {
        return await this._cubbyholes.broadcasts.get(promise)
    }

    async _entry (entry, queue, broadcast) {
        Compassion.Error.assert(entry != null, 'entry eos')
        this.events.push({ type: 'entry', id: this.id, entry })
        this.log.push(entry)
        if (entry.method == 'government') {
            this._government = entry.government
            const properties = entry.properties
            if (entry.body.arrive) {
                const arrival = entry.body.arrive
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
                                const json = Verbatim.deserialize(message.parts)
                                console.log(message.parts, json)
                                console.log(typeof json)
                                snapshot.queue.push(json)
                            }
                        }
                        snapshot.queue.push(null)
                        subDestructible.destroy()
                    })
                    await this.application.join({
                        method: 'join',
                        self: { id: this.id, arrived: this._government.arrived.promise[this.id] },
                        snapshot: snapshot.shifter,
                        entry: entry.body,
                        replaying: this._replaying,
                        government: this._government
                    })
                    await subDestructible.done
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
                    const promise    = this._government.promise
                    const leader     = this._government.properties[this._government.majority[0]].url
                    const broadcasts = await this._ua.json(leader, './broadcasts', { promise })
                    Compassion.Error.assert(broadcasts != null, 'BROADCAST_BACKLOG_ERROR', { level: 'warn' })
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
                const depart = entry.body.departed
                const promise = depart.promise
                const broadcasts = []
                for (const key in this._broadcasts) {
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
            this._kibitzer.paxos.acclimate()
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
                const broadcast = this._broadcasts[envelope.key]
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

class Compassion {
    static Error = Interrupt.create('Compassion.Error', {
        SNAPSHOT_STREAM_ERROR: 'error occurred while processing snapshot stream'
    })

    constructor () {
        this.destructible = null
        this._census = null
        this._applications = new Map
        this._republic = Date.now()
    }

    _bound (destructible, { address, port }, { census, applications }) {
        this.destructible = destructible
        this._createdAt = Date.now()
        this._census = census
        this._applications = applications
        this._scheduler = new Scheduler
        const id = `${address}:${port}`
        const events = new Queue
        // TODO For now, we can crash restart on unrecoverable.
        for (const application in applications) {
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
            const conference = new Conference(subDestructible.durable('conference'), {
                id: id,
                ua: ua,
                kibitzer: kibitzer,
                consumer: applications[application]
            })
            const messages = conference.messages.shifter()
            subDestructible.ephemeral('enqueue', async () => {
                for await (const message of messages) {
                    kibitzer.paxos.enqueue(Date.now(), message.republic, message.body)
                }
            })
            subDestructible.destruct(() => messages.destroy())
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
            this._scheduler.on('data', data => events.push(data.body))
            const timer = new Timer(this._scheduler)
            destructible.destruct(() => timer.destroy())
            destructible.destruct(() => this._scheduler.clear())
            destructible.destruct(() => events.push(null))
            destructible.durable('chaperon', this._chaperon(events.shifter(), census))
            this._scheduler.schedule(Date.now(), scheduleKey, {
                // TODO Configure location for proxies and such.
                name: 'discover', application, id, properties: {}
            })
        }
    }

    async _chaperon (events, census) {
        for await (const event of events) {
            const { application, id } = event
            const islanders = []
            const population = await census.population(application)
            for (const location of population) {
                const islander = await ua.json(location, `/compassion/${application}/paxos`)
                if (islander != null) {
                    islanders.push({
                        id: islander.id,
                        government: islander.government,
                        cookie: islander.cookie,
                        url: url.resolve(location, `/compassion/${application}/`),
                        createdAt: this._createdAt
                    })
                }
            }
            const complete = islanders.length == population.length && islanders.length != 0
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
                    this.scheduler.schedule(Date.now() + this._ping.chaperon, event.key, event)
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

    async paxos ({ params }) {
        const islanders = []
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

    async broadcasts ({ params: { application }, body: { promise } }) {
        return await this._getApplication404(application).conference.broadcasts(promise)
    }

    async _snapshot ({ params, body: { promise } }, reply) {
        const application = this._getApplication404(params.application).application
        const snapshot = new Queue().shifter().paired
        const subDestructible = this.destructible.ephemeral(`snapshot.${promise.replace('/', '.')}`)
        console.log('>> CALLED', !! application, !! subDestructible)
        const through = new stream.PassThrough
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

    async listen (options) {
        await reactor.fastify.listen(options)
        this.destructible.destruct(() => reactor.fastify.close())
        return reactor.fastify.server.address()
    }
}

exports.listen = async function (destructible, options) {
    const compassion = new Compassion(destructible, options)
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
        path: '/compassion/:application/broadcasts',
        method: 'post',
        f: compassion.broadcasts.bind(compassion)
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
    destructible.destruct(() => reactor.fastify.close())
    const address = reactor.fastify.server.address()
    compassion._bound(destructible, address, options)
    return address
}
