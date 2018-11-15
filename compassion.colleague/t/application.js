var cadence = require('cadence')
var Signal = require('signal')
var Procession = require('procession')
var assert = require('assert')

function Application () {
    this.arrived = new Signal
    this.blocker = new Signal
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
            envelope.snapshot.dequeue(async())
        }, function (value) {
            assert(value == null)
        })
        break
    case 'arrive':
        if (envelope.entry.arrive.id == envelope.self.id) {
            setTimeout(function () { this.arrived.unlatch() }.bind(this), 0)
        }
        break
    case 'receive':
        async(function () {
            if (envelope.self.id == 'second') {
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

Application.prototype.snapshot = cadence(function (async, promise, outbox) {
    outbox.push(1)
    outbox.push(null)
})

module.exports = Application
