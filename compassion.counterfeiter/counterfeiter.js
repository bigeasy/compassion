var cadence = require('cadence')
var Network = require('./network')
var abend = require('abend')
var Destructor = require('destructible')
var UserAgent = require('./ua')
var Denizen = require('./denizen')
var Terminator = require('destructible/terminator')

function Counterfeiter (network, conference) {
    this._denizens = {}
    this._destructible = new Destructor('counterfeiter')
    this._destructible.markDestroyed(this, 'destroyed')
    this._destructible.events.pump(new Terminator(1000), 'enqueue')
}

Counterfeiter.prototype.bootstrap = cadence(function (async, conference, identifier) {
    var denizen = this._denizens[identifier] = new Denizen(conference, identifier, new UserAgent(this))
    this._destructible.addDestructor([ 'denizen', identifier ], denizen, 'destroy')
    denizen.bootstrap(this._destructible.rescue())
    denizen.ready.wait(async())
})

Counterfeiter.prototype.stop = function (identifier) {
    this._destructible.invokeDestructor([ 'denizen', identifier ])
}

Counterfeiter.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Counterfeiter
