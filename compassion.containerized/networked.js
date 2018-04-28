var cadence = require('cadence')
var Reactor = require('reactor')

var logger = require('prolific.logger').createLogger('compassion.networked')

var coalesce = require('extant')

var raiseify = require('vizsla/raiseify')

function Networked (destructible, colleagues) {
    this._destructible = destructible
    this._colleagues = colleagues
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /island/:island/islanders', 'islanders')
        dispatcher.dispatch('POST /island/:island/islander/:id/arrive', 'arrive')
        dispatcher.dispatch('POST /island/:island/islander/:id/kibitz', 'kibitz')
        dispatcher.dispatch('POST /island/:island/islander/:id/broadcasts', 'broadcasts')
        dispatcher.dispatch('POST /island/:island/islander/:id/backlog', 'backlog')
        dispatcher.dispatch('GET /health', 'health')
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

Networked.prototype.arrive = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    return colleague.kibitzer.arrive(request.body.republic, request.body.id, request.body.cookie, request.body.properties)
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
    this._getColleague(island, id).conference.getSnapshot(request.body.promise, async())
})

Networked.prototype.backlog = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    async(function () {
        colleague.ua.fetch({
            url: './backlog',
            post: request.body,
            gateways: [ null, raiseify() ]
        }, async())
    }, function (stream, response) {
        return [ 200, response.headers, function (response) { stream.pipe(response) } ]
    })
})

Networked.prototype.health = cadence(function (async) {
    var colleagues = []
    for (var island in this._islands) {
        for (var id in this._islands[island]) {
            var colleague = this._islands[island][id]
            colleagues.push({
                initalizer: colleagues.initalizer,
                government: colleagues.kibitzer.paxos.government,
                initialized: false
            })
        }
    }
    return { colleagues: colleagues }
})

module.exports = Networked
