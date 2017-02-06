var cadence = require('cadence')
var Inlet = require('inlet/dispatcher')

function Conduit () {
    var inlet = new Inlet(this)
    inlet.dispatch('GET /', 'index')
    this.dispatcher = inlet
}

Conduit.prototype.index = cadence(function (async) {
    return 'Compassion Conduit API\n'
})

module.exports = Conduit
