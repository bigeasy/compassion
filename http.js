var cadence = require('cadence')
var Dispatcher = require('inlet/dispatcher')

function Compassion () {
    var dispatcher = new Dispatcher({ object: this, workers: 256 })
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('GET /health', 'health')
    this.dispatcher = dispatcher
}

Compassion.prototype.index = cadence(function () {
    return 'Compassion API'
})

Compassion.prototype.health = cadence(function () {
    return { http: this.dispatcher.turnstile.health }
})

module.exports = Compassion
