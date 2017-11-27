var cadence = require('cadence')
var Reactor = require('reactor')

function Conduit (rendezvous) {
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /health', 'health')
    })
    this._rendezvous = rendezvous
}

Conduit.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion Conduit API\n' ]
})

Conduit.prototype.health = cadence(function (async) {
    return {
        health: this.reactor.turnstile.health,
        paths: this._rendezvous.paths
    }
})

module.exports = Conduit
