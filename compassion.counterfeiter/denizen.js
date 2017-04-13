var cadence = require('cadence')
var Responder = require('conduit/responder')
var Destructible = require('destructible')
var Signal = require('signal')
var Colleague = require('compassion.colleague/colleague')
var Kibitzer = require('kibitz')

function Denizen (conference, identifier, ua) {
    var kibitzer = this.kibitzer = new Kibitzer({ id: identifier, ping: 1, timeout: 2 })
    var responder = new Responder(ua, 'kibitz', kibitzer.write, kibitzer.read)
    this._colleague = new Colleague(null, kibitzer)
    this._conference = conference
    this._identifier = identifier
    this._destructible = new Destructible([ 'denizen', identifier ])
    this._destructible.markDestroyed(this)
    this.listening = new Signal
    this._Date = Date
    this.ready = new Signal
}


Denizen.prototype.bootstrap = cadence(function (async) {
    this._destructible.stack(async, 'kibitzer')(function (ready) {
        this._destructible.addDestructor('kibitzer', this.kibitzer, 'destroy')
        this.kibitzer.listen(async())
        ready.unlatch()
    })
    this._destructible.stack(async, 'log')(function (ready) {
        this._destructible.addDestructor('colleague', this._colleague, 'destroy')
        this._colleague.pump(this._conference)
        this._colleague.log(async())
        ready.unlatch()
    })
    this._destructible.rescue(async, 'bootstrap')(function () {
        async(function () {
            this._colleague.getProperties(async())
        }, function (properties) {
            properties.location = this.kibitzer.paxos.id
            this.kibitzer.bootstrap(this._Date.now(), properties)
        })
    })
    this._destructible.ready.wait(this.ready, 'unlatch')
})

Denizen.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Denizen
