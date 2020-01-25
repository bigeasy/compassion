const stream = require('stream')

const Reactor = require('reactor')
const Queue = require('avenue')
const Conduit = require('conduit')

const { Timer, Scheduler } = require('happenstance')

const axios = require('axios')
const httpAdapter = require('axios/lib/adapters/http')

const logger = require('prolific.logger').create('compassion.networked')

const coalesce = require('extant')

const Serialize = require('avenue/serialize')
const Deserialize = require('avenue/deserialize')

const Keyify = require('keyify')
const Kibitzer = require('kibitz')

const ua = require('./ua')
const discover = require('./discover')
const embark = require('./embark')

const Staccato = require('staccato')

async function recorder (shifter, queue, id, type) {
    for await (const body of shifter.iterator()) {
        // **TODO** Make safety copy optional.
        // **TODO** Better yet, serialize and deserialze through a pseudo pipe
        // when you are testing locally, add to `construct` below.
        await queue.push({ type, id, body: JSON.parse(JSON.stringify(body)) })
    }
}

let instance = 0

class Connection {
    constructor (destructible, colleague, shifter, queue) {
        this._destructible = destructible
        this.ready = new Promise(resolve => this._ready = resolve)
        this.kibitzer = null
        this.destroyed = false
        destructible.destruct(() => this.destroyed = true)
        this.conduit = new Conduit(destructible.durable('conduit'), shifter, queue, (header, queue, shifter) => {
            switch (header.method) {
            case 'connect':
                return this._connect(destructible.durable([ header.island, header.id ]), colleague, header, queue, shifter)
            case 'broadcasts':
                return this._broadcast(header)
            case 'snapshot':
                return this._snapshot(header, queue)
            }
        })
        destructible.destruct(() => shifter.destroy())
    }

    destroy () {
        this._destructible.destroy()
    }

    async _connect (destructible, colleague, header, queue, shifter) {
        const { id, island, properties } = header

        this.properties = properties

        // Kind of a stop gap that either perofrms network requests, or records
        // them for replay.
        const kibitzer =  this.kibitzer = new Kibitzer(destructible.durable('kibitz'), {
            id: id,
            ping: colleague._ping.paxos,
            timeout: colleague._timeout.paxos,
            ua: {
                send: async (envelope) => ua.json(envelope.to.url, './kibitz', envelope)
            }
        })

        // **TODO** Paxos.destroy
        destructible.destruct(() => {
            console.log('DESTROYING!!!', id)
            // entries.destroy()
            kibitzer.paxos.log.push(null)
            kibitzer.paxos.pinged.push(null)
            kibitzer.paxos.outbox.push(null)
            kibitzer.played.push(null)
            kibitzer.islander.outbox.push(null)
            console.log('DESTROYED!!!', id)
        })

        // **TODO** Any way to make this a one-liner?
        const scheduleKey = Keyify.stringify({ island, id })

        // Add ourselves to the `Colleague`s collection of connections.
        if (colleague.connections[island] == null) {
            colleague.connections[island] = {}
        }
        colleague.connections[island][id] = this

        // Remove ourselves from our `Colleagues` connections when we exit.
        destructible.destruct(() => delete colleague.connections[island][id])

        // Unschedule our next chaperon action when we timeout.
        destructible.destruct(() => colleague.scheduler.unschedule(scheduleKey))

        // Reset our liveness check if we're still getting Paxos pings.
        destructible.durable('pinged', async () => {
            for await (const envelope of kibitzer.paxos.pinged.async.shifter().iterator()) {
                const when = Date.now() + colleague._timeout.chaperon
                colleague.scheduler.schedule(when, scheduleKey, {
                    name: 'recoverable', island, id
                })
            }
        })

        // Record various events to our events log.
        destructible.durable('played', recorder(kibitzer.played.shifter(), colleague.events, id, 'kibitzer'))
        destructible.durable('paxos', recorder(kibitzer.paxos.outbox.shifter(), colleague.events, id, 'paxos'))
        destructible.durable('islander', recorder(kibitzer.islander.outbox.shifter(), colleague.events, id, 'islander'))

        this.createdAt = Date.now()

        const entries = kibitzer.paxos.log.async.shifter()

        // entries.shifter().pump(entry => console.log('!!!', id, entry && entry.promise))

        // Forward Paxos log entries to our `Conference`.
        destructible.durable('entries', async () => {
            for await (const entry of entries.iterator()) {
                await queue.push(entry)
                console.log('pushed', id, entry.promise)
            }
            console.log('exit entries loop', id)
            await queue.push(null)
        })
        destructible.durable('receive', async () => {
            for await (const envelope of shifter.iterator()) {
                switch (envelope.method) {
                case 'acclimate':
                    kibitzer.acclimate()
                    break
                case 'broadcast':
                case 'reduce':
                    kibitzer.publish(envelope)
                    break
                }
            }
        })

        colleague.scheduler.schedule(Date.now(), scheduleKey, {
            name: 'discover', island, id, properties
        })
    }

    async _broadcast (header) {
        const government = this.kibitzer.paxos.government
        const leader = government.properties[government.majority[0]].url
        const { promise } = header
        console.log('callling!!!!', leader, './broadcasts', promise)
        const got = await ua.json(leader, './broadcasts', { promise })
        console.log('______', got)
        return got
    }

    async _snapshot (header, queue) {
        const government = this.kibitzer.paxos.government
        const leader = government.properties[government.majority[0]].url
        const { promise } = header
        const stream = await ua.stream(leader, './snapshot', { promise })
        await Deserialize(new Staccato.Readable(stream), queue)
    }
}

class Colleague {
    constructor (destructible, options) {
        this.events = new Queue
        this._Conference = options.Conference
        this._instance = { connection: -1, application: -1 }
        this._destructible = destructible
        this._colleagues = { island: {}, token: {} }
        this._timeout = options.timeout
        this._ping = options.ping
        this.connections = {}
        this.scheduler = new Scheduler

        const events = new Queue

        destructible.durable('scheduler', async () => {
            for await (const event of events.shifter().iterator()) {
                const { island, id } = event
                const connection = this._getConnection(island, id)
                const census = await options.population.census(island)
                const islanders = census.filter(islander => islander != null)
                const complete = islanders.length == census.length && islanders.length != 0
                if (!connection.destroyed) {
                    await this._chaperon(connection, event, islanders, complete)
                }
            }
        })
        destructible.destruct(() => events.push(null))

        this.scheduler.on('data', data => events.push(data.body))
        destructible.destruct(() => this.scheduler.clear())

        const timer = new Timer(this.scheduler)
        destructible.destruct(() => timer.destroy())

        // Happenstance always pushed out one event at a time. We changed it to
        // an `EventEmitter`, causing me to think I'd lost a property of
        // grouping, but it never was, but a grouping would allow us to make a
        // single query for the population, and maybe happenstance should window
        // events so that they can occur at roughly the same time and be
        // grouped, so instead of millisecond timing, you might have ten second
        // timing where events are rounded.
        this.reactor = new Reactor([{
            path: '/',
            method: 'get',
            f: this.index.bind(this)
        }, {
            path: '/island/:island/islanders',
            method: 'get',
            f: this.islanders.bind(this)
        }, {
            path: '/island/:island/islander/:id/embark',
            method: 'post',
            f: this.embark.bind(this)
        }, {
            path: '/island/:island/islander/:id/kibitz',
            method: 'post',
            f: this.kibitz.bind(this)
        }, {
            path: '/island/:island/islander/:id/broadcasts',
            method: 'post',
            f: this.broadcasts.bind(this)
        }, {
            path: '/island/:island/islander/:id/snapshot',
            method: 'post',
            f: this.snapshot.bind(this)
        }])
    }

    index () {
        return 'Compassion Colleague API\n'
    }

    _getConnection (island, id) {
        if (this.connections[island] == null || this.connections[island][id] == null) {
            return null
        }
        return this.connections[island][id]
    }

    _getConnection404 (island, id) {
        const connection = this._getConnection(island, id)
        if (connection == null) {
            throw 404
        }
        return connection
    }

    embark (request) {
        const { island, id } = request.params
        const colleague = this._getConnection404(island, id)
        return colleague.kibitzer.embark(request.body.republic, request.body.id, request.body.cookie, request.body.properties)
    }

    kibitz (request) {
        const { island, id } = request.params
        logger.info('recorded', {
            source: 'middleware',
            method: request.body.method,
            url: request.url,
            $body: request.body
        })
        return this._getConnection404(island, id).kibitzer.request(request.body)
    }

    async broadcasts (request) {
        console.log('http post broadcasts')
        const { island, id } = request.params
        const got = await this._getConnection404(island, id).conduit.invoke({
            method: 'broadcasts',
            promise: request.body.promise
        })
        console.log('>>>>', got)
        return got
    }

    async snapshot (request, reply) {
        const { island, id } = request.params
        const { shifter } = this._getConnection404(island, id).conduit.shifter({
            method: 'snapshot',
            promise: request.body.promise,
            inbox: true
        })
        const through = new stream.PassThrough
        reply.code(200)
        reply.header('content-type', 'application/octet-stream')
        reply.send(through)
        console.log('serializing')
        await Serialize(shifter, new Staccato.Writable(through))
    }

    islanders (request) {
        const islanders = []
        const island = this.connections[request.params.island]
        if (island != null) {
            for (const id in island) {
                const connection = island[id]
                islanders.push({
                    id: connection.kibitzer.paxos.id,
                    government: connection.kibitzer.paxos.government,
                    cookie: coalesce(connection.kibitzer.paxos.cookie),
                    createdAt: connection.createdAt
                })
            }
        }
        return islanders
    }

    async _chaperon (connection, event, islanders, complete) {
        let action
        const { island, id } = event
        const scheduleKey = Keyify.stringify({ island, id })
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
        logger.notice('overwatch', {
            $islanders: islanders,
            $event: event,
            $action: action,
            complete: complete
        })
        switch (action.action) {
        case 'bootstrap': {
                // **TODO** Remove defensive copy.
                const properties = { ...event.properties, url: action.url }
                connection.kibitzer.bootstrap(Date.now(), properties)
            }
            break
        case 'join': {
                connection.kibitzer.join(action.republic)
                const properties = { ...event.properties, url: action.url }
                this.scheduler.schedule(Date.now(), scheduleKey, {
                    name: 'embark',
                    island: event.island,
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
                this.scheduler.schedule(Date.now() + this._ping.chaperon, scheduleKey, event)
                // If this fails, we don't care. Embarkation is designed to be
                // asynchronous in the macro. You send a message. Maybe it gets
                // there, maybe it doesn't. You'll know when the Paxos object
                // starts working. Until then, keep sending embarkation
                // requests. The leader knows how to deal with duplicate or
                // in-process requests.
                await ua.json(action.url, './embark', {
                    republic: event.republic,
                    id: connection.kibitzer.paxos.id,
                    cookie: connection.kibitzer.paxos.cookie,
                    properties: event.properties
                })
            }
            break
        case 'retry': {
                this.scheduler.schedule(Date.now() + this._ping.chaperon, event.key, event)
            }
            break
        case 'unrecoverable': {
                connection.destroy()
            }
            break
        }
    }

    _nextInstance (method) {
        return this._instance[method] = String(BigInt(this._instance[method]) + 1n)
    }

    connect (shifter, queue) {
        const instance = this._nextInstance('connection')
        const destructible = this._destructible.ephemeral([ 'connection', instance ])
        new Connection(destructible, this, shifter, queue)
    }

    terminate (island, id) {
        const connection = this._getConnection(island, id)
        if (connection != null) {
            connection.destroy()
        }
    }
}

module.exports = Colleague
