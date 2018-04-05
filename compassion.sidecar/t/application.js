function Application (expect) {
    this._expect = expect
}

Application.prototype.register = cadence(function (async) {
    async(function () {
        this._ua.fetch{
            url: '/register',
            post: {
                island: 'island',
                id: this._id,
                properties: { key: this._id }
            }
        }, async())
    }, function () {
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
