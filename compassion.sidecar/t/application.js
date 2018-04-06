var cadence = require('cadence')
var Reactor = require('reactor')
var Vizsla = require('vizsla')
var jsonify = require('vizsla/jsonify')
var Signal = require('signal')

function Application (id) {
    this._id = id
    this.arrived = new Signal
    this._ua = new Vizsla().bind({ gateways: [ jsonify({}) ] })
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('POST /bootstrap', 'bootstrap')
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
                properties: { key: this._id }
            }
        }, async())
    }, function () {
        console.log('xxx')
    })
})

Application.prototype.backlog = cadence(function (async, request) {
    return { a: 1 }
})

Application.prototype.bootstrap = cadence(function (async, request) {
    okay(request.body.government.promise, '1/0', 'bootstrapped')
    return 200
})

Application.prototype.join = cadence(function (async, request) {
    var envelope = request.body
    if (envelope.self != 'fourth') {
        return 200
    }
    okay(envelope.government.properties.fourth, {
        key: 'value',
        url: 'http://127.0.0.1:8888/fourth/'
    }, 'properties')
    async(function () {
        this._ua.fetch({
            token: this._token,
            url: '/backlog'
        }, async())
    }, function (body) {
        okay(body, { a: 1 }, 'backlog')
        this._ua.fetch({
            token: this._token,
            post: { a: 1 },
            url: '/record'
        }, async())
    }, function (body) {
        okay(body, { a: 1 }, 'record')
    })
})

Application.prototype.arrive = cadence(function (async, request) {
    if (request.body.government.arrival.id == this._id) {
        this.arrived.unlatch()
    }
    if (request.body.government.arrival.id == 'fourth') {
        okay(true, 'arrived')
    }
})

Application.prototype.acclimated = cadence(function (async, request) {
    if (request.body.government.arrival.id == 'fourth') {
        okay(true, 'arrived')
    }
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
