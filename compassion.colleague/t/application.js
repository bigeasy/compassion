var cadence = require('cadence')
var Reactor = require('reactor')
var Vizsla = require('vizsla')
var Signal = require('signal')

function Application (id, okay) {
    this._id = id
    this._okay = okay
    this.arrived = new Signal
    this.blocker = new Signal
    this._ua = new Vizsla()
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('POST /register', '_register')
        dispatcher.dispatch('POST /bootstrap', 'bootstrap')
        dispatcher.dispatch('POST /join', 'join')
        dispatcher.dispatch('POST /arrive', 'arrive')
        dispatcher.dispatch('POST /backlog', 'backlog')
        dispatcher.dispatch('POST /acclimated', 'acclimated')
        dispatcher.dispatch('POST /receive/message', 'receiveMessage')
        dispatcher.dispatch('POST /reduced/message', 'reducedMessage')
        dispatcher.dispatch('POST /depart', 'depart')
    })
}

Application.prototype.register = cadence(function (async, url) {
    async(function () {
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            url: '/register',
            post: {
                token: 'x',
                island: 'island',
                id: this._id,
                url: url,
                properties: { key: this._id },
                bootstrap: true,
                join: true,
                arrive: true,
                depart: true,
                acclimated: true,
                government: false,
                receive: [ 'message' ],
                reduced: [ 'message' ]
            },
            raise: true,
            parse: 'json'
        }, async())
        console.log('DOING')
    }, function () {
        console.log('DONE')
        return []
    })
})

Application.prototype._register = cadence(function (async, request) {
    this._token = request.body.token
    return 200
})

Application.prototype.backlog = cadence(function (async, request) {
    this._okay.call(null, request.body, { promise: '4/0' }, 'backlog promise')
    return { a: 1 }
})

Application.prototype.bootstrap = cadence(function (async, request) {
    this._okay.call(null, request.body.government.properties.first.url, 'http://127.0.0.1:8486/island/island/islander/first/', 'url')
    return 200
})

Application.prototype.join = cadence(function (async, request) {
    var envelope = request.body
    console.log('JOINING', envelope.self)
    if (envelope.self != 'third') {
        return 200
    }
    this._okay.call(null, envelope.government.properties.third, {
        key: 'third',
        url: 'http://127.0.0.1:8486/island/island/islander/third/'
    }, 'properties')
    async(function () {
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            token: this._token,
            url: '/backlog',
            parse: 'json',
            raise: true
        }, async())
    }, function (body) {
        this._okay.call(null, body, { a: 1 }, 'backlog')
        this._ua.fetch({
            url: 'http://127.0.0.1:8386/'
        }, {
            token: this._token,
            url: '/record',
            parse: 'json',
            raise: true
        },  envelope.replaying ? {
            post: { a: 1 },
        } : {}, async())
    }, function (body, response) {
        this._okay.call(null, body, { a: 1 }, 'record')
        return 200
    })
})

Application.prototype.arrive = cadence(function (async, request) {
    if (request.body.arrived.id == this._id) {
        setTimeout(function () { this.arrived.unlatch() }.bind(this), 250)
    }
    if (request.body.arrived.id == 'second') {
        this._okay.call(null, true, 'arrived')
    } else if (request.body.self == 'fourth') {
        return 500
    }
    return 200
})

Application.prototype.acclimated = cadence(function (async, request) {
    if (request.body.self == 'fourth') {
        this._okay.call(null, true, 'acclimated')
        return 500
    }
    return 200
})

Application.prototype.depart = cadence(function (async, request) {
    if (request.body.self == 'fifth') {
        this._okay.call(null, request.body.departed.id, 'first', 'departed')
    }
    return 200
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
    if (request.body.self == 'first') {
        switch (++reducedNumber) {
        case 1:
            this._okay.call(null, request.body.body.mapped, {
                '1/0': { from: 'first' },
                '2/0': { from: 'second' },
                '4/0': { from: 'third' }
            }, 'message reduced during departure')
            break
        case 2:
            this._okay.call(null, request.body.body.mapped, {
                '1/0': { from: 'first' },
                '2/0': { from: 'second' },
                '4/0': { from: 'third' },
                '9/0': { from: 'fifth' }
            }, 'message reduced after backlog')
            break
        }
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
            parse: 'json',
            raise: true
        }, async())
    }, function (body) {
        return []
    })
})

module.exports = Application
