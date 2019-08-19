const Reactor = require('reactor')

const logger = require('prolific.logger').createLogger('compassion.networked')

const coalesce = require('extant')

const Serialize = require('avenue/serialize')

class Networked {
    constructor (destructible, colleagues) {
        this._destructible = destructible
        this._colleagues = colleagues
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
            f: this.kibits.bind(this)
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
        return 'Compassion Networked API\n'
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

    async broadcasts (request, island, id) {
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

    islanders (request, name) {
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
}

module.exports = Networked
