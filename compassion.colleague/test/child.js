const Conference = require('../../compassion.conference')
const Compassion = require('../compassion')(Conference)

/*
function Listener (colleague) {
    this.colleague = colleague
}

Listener.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    destructible.durable('conduit', Conduit, inbox, outbox, this, cadence(function (async, request, inbox, outbox) {
        colleague.register(inbox, outbox, request, async())
        outbox.push({ method: 'registered' })
    }), async())
})

function Application () {
    this.bootstrapped = new Signal
}

Application.prototype.dispatch = cadence(function (async, envelope) {
    switch (envelope.method) {
    case 'bootstrap':
        this.bootstrapped.unlatch(null, 'bootstrapped')
        break
    }
})

module.exports = cadence(function (async, destructible, olio, properties) {
    var application = new Application
    async(function () {
        destructible.durable('compassion', Compassion, olio, application, 'island', 'first', {}, async())
    }, function (conference) {
        application.conference = conference
        return application
    })
})
*/

// Sketch.
module.exports = async function (destructible, olio, properties) {
    const assert = require('assert')
    const broadcast = await Compassion(destructible.durable('compassion'), olio, async (envelope, broadcast) => {
        switch (envelope.method) {
        case 'bootstrap':
            break
        case 'join':
            assert.equal(await shifter.shift(), 1, 'join')
            assert.equal(await shifter.shift(), null, 'eos')
            break
        case 'arrive':
            if (envelope.entry.arrive.id == envelope.self.id) {
                setTimeout(() => olio.broadcast('application:arrived', { index: olio.index }) , 0)
            }
            break
        case 'receive':
            if (envelope.self.id == 'second') {
                await once(olio, 'message', message => message.index == olio.index)
            }
            return { from: envelope.self.id }
        case 'reduce':
            break
        case 'depart':
            break
        }
    }, 'island', 'first')
    return null
}
