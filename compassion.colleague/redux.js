const url = require('url')

const Reactor = require('reactor')
const { Timer, Scheduler } = require('happenstance')
const { Queue } = require('avenue')
const Kibitzer = require('kibitz')
const Keyify = require('keyify')
const { coalesce } = require('extant')

const ua = require('./ua')
const Conference = require('./conference')
const discover = require('./discover')

class Compassion {
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
                ua: { send: async envelope => ua.json(envelope.to.url, './kibitz', envelope) }
            })
            const conference = new Conference(subDestructible.durable('conference'), {
                id: id,
                ua: ua,
                log: kibitzer.paxos.log.shifter().async,
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
                conference: null,
                kibitzer: kibitzer
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
                    application.kibitzer.join(action.republic)
                    const properties = { ...event.properties, url: action.url }
                    this.scheduler.schedule(Date.now(), scheduleKey, {
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
                    this.scheduler.schedule(Date.now() + this._ping.chaperon, scheduleKey, event)
                    // If this fails, we don't care. Embarkation is designed to be
                    // asynchronous in the macro. You send a message. Maybe it gets
                    // there, maybe it doesn't. You'll know when the Paxos object
                    // starts working. Until then, keep sending embarkation
                    // requests. The leader knows how to deal with duplicate or
                    // in-process requests.
                    await ua.json(action.url, './embark', {
                        republic: event.republic,
                        id: application.kibitzer.paxos.id,
                        cookie: application.kibitzer.paxos.cookie,
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

    async embark () {
    }

    async kibitz (request) {
        const application = this._getApplication404(request.params.application)
        return application.kibitzer.request(request.body)
    }

    async broadcasts () {
    }

    async snapshot () {
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
        path: '/island/:island/islander/:id/embark',
        method: 'post',
        f: compassion.embark.bind(compassion)
    }, {
        path: '/compassion/:application/kibitz',
        method: 'post',
        f: compassion.kibitz.bind(compassion)
    }, {
        path: '/island/:island/islander/:id/broadcasts',
        method: 'post',
        f: compassion.broadcasts.bind(compassion)
    }, {
        path: '/island/:island/islander/:id/snapshot',
        method: 'post',
        f: compassion.snapshot.bind(compassion)
    }])
    await reactor.fastify.listen(options.bind)
    destructible.destruct(() => reactor.fastify.close())
    const address = reactor.fastify.server.address()
    compassion._bound(destructible, address, options)
    return address
}
