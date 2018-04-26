var cadence = require('cadence')
var Reactor = require('reactor')

var logger = require('prolific.logger').createLogger('compassion.networked')

var raiseify = require('vizsla/raiseify')

function Networked (destructible, colleagues) {
    this._destructible = destructible
    this._colleagues = colleagues
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /:island/:id/bootstrap', 'bootstrap')
        dispatcher.dispatch('POST /:island/:id/join', 'join')
        dispatcher.dispatch('POST /:island/:id/kibitz', 'kibitz')
        dispatcher.dispatch('POST /:island/:id/broadcasts', 'broadcasts')
        dispatcher.dispatch('POST /:island/:id/backlog', 'backlog')
        dispatcher.dispatch('POST /publish', 'publish')
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

Networked.prototype._alreadyStarted = function (colleague) {
    if (colleague.initialized) {
        return 401
    }
}

Networked.prototype.bootstrap = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    this._alreadyStarted(colleague)
    colleague.initialized = true
    var properties = JSON.parse(JSON.stringify(colleague.initalizer.properties || {}))
    properties.url = request.body.url.self
    colleague.kibitzer.bootstrap(request.body.republic, properties)
    return 200
})

Networked.prototype.join = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    this._alreadyStarted(colleague)
    colleague.initialized = true
    var properties = JSON.parse(JSON.stringify(colleague.initalizer.properties || {}))
    properties.url = request.body.url.self
    async(function () {
        colleague.kibitzer.join(request.body.republic, { url: request.body.url.leader }, properties, async())
    }, function (success) {
        if (!success) {
            colleague.destructible.destroy()
            throw 500
        }
        return 200
    })
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
        if (!response.okay) {
            throw 503
        }
        return [ 200, response.headers, function (response) { stream.pipe(response) } ]
    })
})

Networked.prototype.register = cadence(function (async) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    destructible.monitor('colleague', true, this, 'colleague', request.body, async())
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
