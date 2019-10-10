const Reactor = require('reactor')
const Avenue = require('avenue')
const Conduit = require('conduit')
const Future = require('prospective/future')

const logger = require('prolific.logger').create('compassion.networked')

const coalesce = require('extant')

const Serialize = require('avenue/serialize')

class Connection {
    constructor (destructible) {
        this.ready = new Future
        this._destructible = destructible
    }

    async request (request, queue, shifter) {
        switch (request.method) {
        case 'connect':
            console.log(request)
            console.log(queue)
            for await (const entry of shifter.iterator()) {
                await this._entry(entry, queue)
            }
            break
        case 'snapshot':
            break
        case 'broadcasts':
            break
        }
    }
}

class Colleague {
    constructor (destructible, colleagues) {
        this.events = new Avenue
        this._instance = 0
        this._destructible = destructible
        this._colleagues = { island: {}, token: {} }
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

    _getColleague (island, id) {
        if (this._colleagues.island[island] == null || this._colleagues.island[island][id] == null) {
            throw 404
        }
        return this._colleagues.island[island][id]
    }

    embark (request) {
        const { island, id } = request.params
        const colleague = this._getColleague(island, id)
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
        return this._getColleague(island, id).kibitzer.request(request.body)
    }

    async broadcasts (request) {
        const { island, id } = request.params
        return await this._getColleague(island, id).conduit.request({
            method: 'broadcasts',
            promise: request.body.promise
        })
    }

    async snapshot (request, reply) {
        const { queue } = this._getColleague(reply.params.island, reply.params.id).conduit.request({
            method: 'snapshot',
            promise: request.body.promise,
            inbox: true
        })
        const through = new stream.PassThrough
        reply.code(200)
        reply.header('content-type', 'application/octet-stream')
        reply.send(through)
        await Serialize(queue, through)
    }

    islanders (request) {
        const { name } = request.params
        const islanders = []
        const island = this._colleagues.island[name]
        if (island != null) {
            for (const id in island) {
                const colleague = island[id]
                islanders.push({
                    id: colleague.id,
                    government: colleague.kibitzer.paxos.government,
                    cookie: coalesce(colleague.kibitzer.paxos.cookie),
                    createdAt: colleague.createdAt
                })
            }
        }
        return islanders
    }

    _connect (destructible, shifter, queue) {
        const connection = new Connection
        const conduit = new Conduit(destructible.durable('conduit'), shifter, queue, connection.request.bind(connection))
        destructible.destruct(() => shifter.destroy())
        return connection.ready.promise
    }

    connect (shifter, queue) {
        const destructible = this._destructible.durable([ 'conduit', this._instance++])
        return this._connect(destructible, shifter, queue)
    }
}

module.exports = Colleague
