var cadence = require('cadence')

var Conference = require('../../compassion.conference')
var Compassion = require('../compassion')(Conference)

var Signal = require('signal')

function Listener (colleague) {
    this.colleague = colleague
}

Listener.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    destructible.durable('conduit', Conduit, inbox, outbox, this, cadence(function (async, request, inbox, outbox) {
        /* Necessary?
            destructible.destruct.wait(inbox, 'end')
            destructible.destruct.wait(outbox, 'end')
         */
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
