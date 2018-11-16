var cadence = require('cadence')
var Reactor = require('reactor')

var logger = require('prolific.logger').createLogger('compassion.networked')

var coalesce = require('extant')

var Serialize = require('procession/serialize')

var Staccato = require('staccato')

function Networked (destructible, colleagues) {
    this._destructible = destructible
    this._colleagues = colleagues
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /island/:island/islanders', 'islanders')
        dispatcher.dispatch('POST /island/:island/islander/:id/embark', 'embark')
        dispatcher.dispatch('POST /island/:island/islander/:id/kibitz', 'kibitz')
        dispatcher.dispatch('POST /island/:island/islander/:id/broadcasts', 'broadcasts')
        dispatcher.dispatch('POST /island/:island/islander/:id/snapshot', 'snapshot')
    })
}

Networked.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Networked API\n' ]
})

Networked.prototype._getColleague = function (island, id) {
    if (this._colleagues.island[island] == null || this._colleagues.island[island][id] == null) {
        throw 404
    }
    return this._colleagues.island[island][id]
}

Networked.prototype.embark = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    return colleague.kibitzer.embark(request.body.republic, request.body.id, request.body.cookie, request.body.properties)
})

Networked.prototype.kibitz = cadence(function (async, request, island, id) {
    logger.info('recorded', {
        source: 'middleware',
        method: request.body.method,
        url: request.url,
        $body: request.body
    })
    this._getColleague(island, id).kibitzer.request(request.body, async())
})

Networked.prototype.broadcasts = cadence(function (async, request, island, id) {
    this._getColleague(island, id).conduit.connect({
        method: 'broadcasts',
        promise: request.body.promise
    }).inbox.dequeue(async())
})

Networked.prototype.snapshot = cadence(function (async, request, island, id) {
    var request = this._getColleague(island, id).conduit.connect({
        method: 'snapshot',
        promise: request.body.promise,
        inbox: true
    })
    return [ 200, { 'content-type': 'application/octet-stream' }, function (response, callback) {
        Serialize(request.inbox, new Staccato.Writable(response), callback)
    } ]
})

Networked.prototype.islanders = cadence(function (async, request, island) {
    var members = []
    var island = this._colleagues.island[island]
    if (island != null) {
        for (var id in island) {
            var colleague = island[id]
            members.push({
                id: colleague.id,
                government: colleague.kibitzer.paxos.government,
                cookie: coalesce(colleague.kibitzer.paxos.cookie),
                createdAt: colleague.createdAt
            })
        }
    }
    return [ 200, { 'content-type': 'application/json' }, members ]
})

module.exports = Networked
