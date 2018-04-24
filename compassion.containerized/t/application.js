var cadence = require('cadence')
var Reactor = require('reactor')
var Vizsla = require('vizsla')
var jsonify = require('vizsla/jsonify')
var raiseify = require('vizsla/raiseify')
var Signal = require('signal')

function Application (id, okay) {
    this._id = id
    this._okay = okay
    this.arrived = new Signal
    this._ua = new Vizsla().bind({ gateways: [ jsonify() ] })
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('POST /bootstrap', 'bootstrap')
        dispatcher.dispatch('POST /join', 'join')
        dispatcher.dispatch('POST /arrive', 'arrive')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /acclimated', 'acclimated')
    })
}

Application.prototype.register = cadence(function (async, url) {
    async(function () {
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            url: '/register',
            post: {
                island: 'island',
                id: this._id,
                url: url,
                properties: { key: this._id },
                bootstrap: true,
                join: true,
                arrive: true,
                depart: true,
                acclimated: true,
                receive: [ 'message' ],
                reduced: [ 'message' ]
            },
            gateways: [ jsonify(), raiseify(), null ]
        }, async())
    }, function (body, response) {
        this._token = body.access_token
        return []
    })
})

Application.prototype.backlog = cadence(function (async, request) {
    this._okay.call(null, request.body, { promise: '3/0' }, 'backlog promise')
    return { a: 1 }
})

Application.prototype.bootstrap = cadence(function (async, request) {
    this._okay.call(null, request.body.government.properties.first.url, 'http://127.0.0.1:8486/island/first/kibitz', 'url')
    return 200
})

Application.prototype.join = cadence(function (async, request) {
    var envelope = request.body
    if (envelope.self != 'third') {
        return 200
    }
    this._okay.call(null, envelope.government.properties.third, {
        key: 'third',
        url: 'http://127.0.0.1:8486/island/third/kibitz'
    }, 'properties')
    async(function () {
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            token: this._token,
            url: '/backlog',
            parse: [ jsonify(), raiseify() ]
        }, async())
    }, function (body) {
        this._okay.call(null, body, { a: 1 }, 'backlog')
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            token: this._token,
            post: { a: 1 },
            url: '/record',
            parse: [ jsonify(), raiseify() ]
        }, async())
    }, function (body, response) {
        console.log(body, response.statusCode)
        this._okay.call(null, true, 'record')
        return 200
    })
})

Application.prototype.arrive = cadence(function (async, request) {
    console.log(request.body, this._id, request.body.government)
    if (request.body.arrived.id == this._id) {
        setTimeout(function () { this.arrived.unlatch() }.bind(this), 250)
    }
    if (request.body.arrived.id == 'second') {
        this._okay.call(null, true, 'arrived')
    } else if (request.body.arrived.id == 'fourth') {
        return 500
    }
    return 200
})

Application.prototype.acclimated = cadence(function (async, request) {
    if (request.body.government.arrived.id == 'second') {
        this._okay.call(null, true, 'arrived')
    }
    return 200
})

Application.prototype.depart = cadence(function (async, request) {
    okay(request.body.government.arrival.id == 'third', 'departed')
})

Application.prototype.receiveMessage = cadence(function (async, request) {
    okay(request.body.government.arrival.id == 'third', 'departed')
})

Application.prototype.reducedMessage = cadence(function (async, request) {
    okay(request.body.government.arrival.id == 'third', 'departed')
})

module.exports = Application
