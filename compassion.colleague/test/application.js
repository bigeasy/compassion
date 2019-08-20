const Signal = require('signal')
const Avenue = require('avenue')
const assert = require('assert')

class Application {
    constructor () {
        this.arrived = new Signal
        this.blocker = new Signal
        this.envelopes = new Avenue
    }

    async dispatch (envelope) {
        this.envelopes.push(envelope)
        switch (envelope.method) {
        case 'bootstrap':
            break
        case 'join':
            console.log('joining!!!')
            async(function () {
                console.log('dequeue')
                envelope.snapshot.dequeue(async())
            }, function (value) {
                console.log('dequeued', value)
            console.log('joining!!!', value)
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
    }

    snapshot (promise, outbox) {
        console.log('snapshot get')
        outbox.push(1)
        outbox.push(null)
    }
}

module.exports = Application
