var util = require('util')
var cadence = require('cadence')
var Middleware = require('./middleware')

// Sencha Connect middleware builder.
var Reactor = require('reactor')

function Local (destructible, colleagues) {
    this._destructible = destructible
    this._colleagues = colleagues
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /register', 'register')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /publish', 'publish')
        dispatcher.dispatch('GET /health', 'health')
    })
}
util.inherits(Local, Middleware)

Local.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Local API\n' ]
})

Local.prototype.colleague = cadence(function (async, destructible, envelope) {
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
        if (this._colleagues.island[envelope.island] == null) {
            this._colleagues.island[envelope.island] = {}
        }
        this._colleagues.island[envelope.island][envelope.id] = {
            initalizer: envelope,
            kibitzer: kibitzer,
            ua: null
        }
    })
})

Local.prototype._getColleague = function () {
    if (request.authorization.scheme != 'Bearer') {
        throw 401
    }
    var colleague = this._colleagues.token[request.authorization.credentials]
    if (colleague == null) {
        throw 401
    }
    return colleague
}

Local.prototype.backlog = cadence(function (async, request) {
    var colleague = this._getColleague(request)
    async(function () {
        colleague.ua.fetch({
            url: this._getLeaderURL()
        }, {
            url: [ 'backlog', colleague.island ].join('/'),
            post: {
                promise: colleague.kibitz.paxos.government.arrivals.promise[this.id]
            },
            gateways: []
        }, async())
    }, function (stream, response) {
        if (!response.okay) {
            throw 503
        }
        return function (response) { stream.pipe(response) }
    })
})

Local.prototype.broadcast = cadence(function (async, request) {
    this._getColleague(request).broadcast(request.method, request.message)
})

Local.prototype.random = cadence(function (async, request) {
})

Local.prototype.when = cadence(function (async) {
})

Local.prototype.register = cadence(function (async) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    this._destructible.monitor('colleague', true, this, 'colleague', request.body, async())
})

module.exports = Local
