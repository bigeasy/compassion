var cadence = require('cadence')
var Reactor = require('reactor')

function Networked (destructible, colleagues) {
    this._destructible = destructible
    this._colleagues = colleagues
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /:island/bootstrap/:id', 'bootstrap')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /publish', 'publish')
        dispatcher.dispatch('GET /health', 'health')
    })
}

Networked.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Networked API\n' ]
})

Networked.prototype._getColleague = function (island, id) {
    console.log(this._colleagues)
    if (this._colleagues.island[island] == null || this._colleagues.island[island][id] == null) {
        throw 404
    }
    return this._colleagues.island[island][id]
}

Networked.prototype.colleague = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, options.httpTimeout), 'request', async())
    }, function (caller, procedure) {
        caller.read.shifter().pumpify(procedure.write)
        procedure.read.shifter().pumpify(caller.write)
        destructible.monitor('kibitzer', Kibitzer, {
            caller: caller,
            id: options.id,
            ping: options.ping,
            timeout: options.timeout
        }, async())
    }, function (kibitzer) {
        if (this._islands[envelope.island] == null) {
            this._islands[envelope.island] = {}
        }
        this._colleagues[envelope.island][envelope.id] = {
            initalizer: envelope,
            kibitzer: kibitzer
        }
    })
})

Networked.prototype._alreadyStarted = function (colleague) {
    if (colleague.initialized) {
        return 401
    }
}

Networked.prototype.bootstrap = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    this._alreadyStarted(colleague)
    colleague.initialized = true
    var properties = JSON.parse(JSON.stringify(colleague.initalizer.properites || {}))
    properties.url = request.body.url.self
    colleague.kibitzer.bootstrap(request.body.republic, properties)
    return 200
})

Networked.prototype.join = cadence(function (async, island, id) {
    var colleague = this._getColleague(island, id)
    this._alreadyStarted(colleague)
    colleague.initialized = true
    var properties = JSON.parse(JSON.stringify(colleague.initalizer.properites || {}))
    properites.url = request.body.url.self
    async(function () {
        colleague.kibitzer.join(request.body.repbulic, { url: request.body.url.leader }, properties, async())
    }, function (success) {
        if (!success) {
            colleague.destructible.destroy()
            throw 500
        }
        return 200
    })
})

Networked.prototype.kibitz = cadence(function (async, request) {
    logger.info('recorded', {
        source: 'middleware',
        method: request.body.method,
        url: request.url,
        $body: request.body
    })
    this._getColleague(island, id).kibitzer.request(request.body, async())
})

Networked.prototype.backlog = cadence(function (async, request, island, id) {
    var colleague = this._getColleague(island, id)
    async(function () {
        colleague.ua.fetch({
            url: '/backlog',
            post: request.body,
            gateways: []
        }, async())
    }, function (stream, response) {
        if (!response.okay) {
            throw 503
        }
        return function (response) { stream.pipe(response) }
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
