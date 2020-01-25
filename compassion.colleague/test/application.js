const assert = require('assert')
const Queue = require('avenue')
const Conference = require('../../compassion.conference/conference')

class Application {
    constructor (destructible, conduit, island, id, properties) {
        this.arrived = new Promise(resolve => this._arrived = resolve)
        this._blocker = new Promise(resolve => this.unblock = resolve)
        this.envelopes = new Queue
        this.conference = new Conference(destructible.ephemeral([ 'conference', island, id ]), conduit, this, island, id, properties)
    }

    async dispatch (envelope, shifter) {
        this.envelopes.push(envelope)
        switch (envelope.method) {
        case 'bootstrap':
            break
        case 'join':
            assert.equal(await shifter.shift(), 1)
            assert.equal(await shifter.shift(), null)
            break
        case 'arrive':
            if (envelope.entry.arrive.id == envelope.self.id) {
                setImmediate(this._arrived)
            }
            break
        case 'receive':
            if (envelope.self.id == 'second') {
                await this._blocker
            }
            return { from: envelope.self.id }
        case 'reduce':
            break
        case 'depart':
            console.log('--- application depart ---')
            break
        }
    }

    async snapshot (promise, queue) {
        await queue.enqueue([ 1, null ])
    }
}

module.exports = Application
