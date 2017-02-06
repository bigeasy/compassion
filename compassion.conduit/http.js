var cadence = require('cadence')
var Inlet = require('inlet/dispatcher')

function Conduit (rendezvous) {
    var inlet = new Inlet(this)
    inlet.dispatch('GET /', 'index')
    inlet.dispatch('GET /health', 'health')
    this.dispatcher = inlet
    this._rendezvous = rendezvous
}

Conduit.prototype.index = cadence(function (async) {
    return 'Compassion Conduit API\n'
})

Conduit.prototype.health = cadence(function (async) {
    return {
        health: this.dispatcher.turnstile.health,
        paths: this._rendezvous._paths
    }
})

module.exports = Conduit
