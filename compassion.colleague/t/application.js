var cadence = require('cadence')
var Reactor = require('reactor')
var Vizsla = require('vizsla')
var Signal = require('signal')
var Procession = require('procession')

function Application (id, okay) {
    this._id = id
    this._okay = okay
    this.arrived = new Signal
    this.blocker = new Signal
    this._ua = new Vizsla()
    this.envelopes = new Procession
}

Application.prototype.dispatch = cadence(function (async, envelope) {
    this.envelopes.push(envelope)
    switch (envelope.method) {
    case 'bootstrap':
        break
    case 'join':
        async(function () {
            envelope.snapshot.dequeue(async())
        }, function (value) {
            console.log('snapshot', value)
        }, function (value) {
            console.log('snapshot eos', value)
        })
        break
    case 'arrive':
        if (envelope.entry.arrive.id == this._id) {
            setTimeout(function () { this.arrived.unlatch() }.bind(this), 0)
        }
        break
    case 'receive':
        async(function () {
            if (this._id == 'second') {
                console.log('blocking')
                this.blocker.wait(async())
            }
        }, function () {
            return { from: envelope.self.id }
        })
        break
    case 'reduce':
        break
    case 'depart':
        break
    }
})

Application.prototype.snapshot = cadence(function (async, outbox) {
    outbox.push(1)
    outbox.push(null)
})

Application.prototype.join = cadence(function (async, request) {
    var envelope = request.body
    console.log('JOINING', envelope.self)
    if (envelope.self.id != 'third') {
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
            url: '/snapshot',
            parse: 'json',
            raise: true
        }, async())
    }, function (body) {
        this._okay.call(null, body, { a: 1 }, 'snapshot')
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
    } else if (request.body.self.id == 'fourth') {
        return 500
    }
    return 200
})

Application.prototype.acclimated = cadence(function (async, request) {
    if (request.body.self.id == 'fourth') {
        this._okay.call(null, true, 'acclimated')
        return 500
    }
    return 200
})

Application.prototype.depart = cadence(function (async, request) {
    if (request.body.self.id == 'fifth') {
        this._okay.call(null, request.body.departed.id, 'first', 'departed')
    }
    return 200
})

var receiveNumber = 0
Application.prototype.receiveMessage = cadence(function (async, request) {
    async(function () {
        if (request.body.self.id == 'first' && ++receiveNumber == 1) {
            this._okay.call(null, request.body.body, { value: 1 }, 'message received')
        } else if (request.body.self.id == 'third' && request.body.body.value == 1) {
            this.blocker.wait(async())
        }
    }, function () {
        return { from: request.body.self.id }
    })
})

var reducedNumber = 0
Application.prototype.reducedMessage = cadence(function (async, request) {
    if (request.body.self.id == 'first') {
        switch (++reducedNumber) {
        case 1:
            this._okay.call(null, request.body.mapped, {
                '1/0': { from: 'first' },
                '2/0': { from: 'second' },
                '4/0': { from: 'third' }
            }, 'message reduced during departure')
            break
        case 2:
            this._okay.call(null, request.body.from, { id: 'third', arrived: '4/0' }, 'reduced from')
            this._okay.call(null, request.body.mapped, {
                '1/0': { from: 'first' },
                '2/0': { from: 'second' },
                '4/0': { from: 'third' },
                '9/0': { from: 'fifth' }
            }, 'message reduced after snapshot')
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
