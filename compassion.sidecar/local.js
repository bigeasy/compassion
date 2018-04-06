var cadence = require('cadence')
var Vizsla = require('vizsla')
var raiseify = require('vizsla/raiseify')
var jsonify = require('vizsla/jsonify')

var Caller = require('conduit/caller')
var Procedure = require('conduit/procedure')
var Kibitzer = require('kibitz')
var UserAgent = require('../compassion.colleague/ua')

// Sencha Connect middleware builder.
var Reactor = require('reactor')

function Local (destructible, colleagues, networkedUrl) {
    this._destructible = destructible
    this._colleagues = colleagues
    this._ping = 1000
    this._ua = new Vizsla
    this._timeout = 5000
    this._httpTimeout = 5000
    this._instance = 0
    this._networkedUrl = networkedUrl
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('POST /register', 'register')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /publish', 'publish')
        dispatcher.dispatch('GET /ping', 'ping')
        dispatcher.dispatch('GET /health', 'health')
    })
}

Local.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Local API\n' ]
})

Local.prototype.colleague = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, this._httpTimeout), 'request', async())
    }, function (caller, procedure) {
        caller.read.shifter().pumpify(procedure.write)
        destructible.destruct.wait(function () { caller.write.push(null) })
        procedure.read.shifter().pumpify(caller.write)
        destructible.destruct.wait(function () { procedure.write.push(null) })
        destructible.monitor('kibitzer', Kibitzer, {
            caller: caller,
            id: this._id,
            ping: this._ping,
            timeout: this._timeout
        }, async())
    }, function (kibitzer) {
        var existed = false
        if (this._colleagues.island[envelope.island] == null) {
            this._colleagues.island[envelope.island] = {}
        } else {
            existed = true
        }
        var colleague = this._colleagues.island[envelope.island][envelope.id] = {
            initalizer: envelope,
            kibitzer: kibitzer,
            ua: new Vizsla().bind({
                url: envelope.url,
                gateways: [ raiseify(), jsonify({}) ]
            })
        }
        async(function () {
            console.log(envelope)
            if (existed) {
            } else {
                this._ua.fetch({
                    url: this._networkedUrl,
                    timeout: 1000,
                    gateways: [ raiseify(), jsonify({}) ]
                }, {
                    url: [ '', envelope.island, 'bootstrap', envelope.id ].join('/'),
                    post: {
                        republic: 0,
                        url: { self: envelope.url }
                    }
                }, async())
            }
        }, function () {
            return 200
        })
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

Local.prototype.register = cadence(function (async, request) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    this._destructible.monitor([ 'colleague', this._instance++ ], true, this, 'colleague', request.body, async())
})

module.exports = Local
