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
    this.blocker = new Signal
    this._ua = new Vizsla().bind({ gateways: [ jsonify() ] })
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('POST /bootstrap', 'bootstrap')
        dispatcher.dispatch('POST /join', 'join')
        dispatcher.dispatch('POST /arrive', 'arrive')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /acclimated', 'acclimated')
        dispatcher.dispatch('POST /receive/message', 'receiveMessage')
        dispatcher.dispatch('POST /reduced/message', 'reducedMessage')
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
        this._okay.call(null, true, 'record')
        return 200
    })
})

Application.prototype.arrive = cadence(function (async, request) {
    if (request.body.arrived.id == this._id) {
        setTimeout(function () { this.arrived.unlatch() }.bind(this), 250)
    }
    if (request.body.arrived.id == 'second') {
        this._okay.call(null, true, 'arrived')
    } else if (request.body.arrived.id == 'fourth') {
        // return 500
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

var receiveNumber = 0
Application.prototype.receiveMessage = cadence(function (async, request) {
    async(function () {
        if (request.body.self == 'first' && ++receiveNumber == 1) {
            this._okay.call(null, request.body.body, { value: 1 }, 'message received')
        } else if (request.body.self == 'third' && request.body.body.value == 1) {
            this.blocker.wait(async())
        }
    }, function () {
        return { from: request.body.self }
    })
})

var reducedNumber = 0
Application.prototype.reducedMessage = cadence(function (async, request) {
    if (request.body.self == 'first' && ++reducedNumber == 1) {
        this._okay.call(null, request.body.body.mapped, {
            '1/0': { from: 'first' },
            '2/0': { from: 'second' },
            '3/0': { from: 'third' },
            '4/0': { from: 'fourth' }
        }, 'message reduced')
    }
    return 200
})

Application.prototype.broadcast = cadence(function (async, value) {
    async(function () {
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            token: this._token,
            post: { method: 'message', message: { value: value } },
            url: '/broadcast',
            parse: [ jsonify(), raiseify() ]
        }, async())
    }, function (body) {
        return []
    })
})

module.exports = Application
