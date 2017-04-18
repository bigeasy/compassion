var cadence = require('cadence')
var Responder = require('conduit/responder')
var Destructible = require('destructible')
var Signal = require('signal')
var Colleague = require('compassion.colleague/colleague')
var Kibitzer = require('kibitz')
var Timer = require('happenstance').Timer

function Denizen (options, ua) {
    var kibitzer = this.kibitzer = new Kibitzer({ id: options.id, ping: 1000, timeout: 2000 })
    kibitzer.paxos.scheduler.events.pump(new Timer(kibitzer.paxos.scheduler), 'enqueue')
    var responder = new Responder(ua, 'kibitz', kibitzer.write, kibitzer.read)
    this._ua = ua
    this._colleague = new Colleague(null, kibitzer, { object: this, method: '_socket' })
    this._conference = options.conference
    this._identifier = options.id
    this._destructible = new Destructible([ 'denizen', options.id ])
    this._destructible.markDestroyed(this)
    this.listening = new Signal
    this._Date = Date
    this.ready = new Signal
}

Denizen.prototype._socket = function (socket, header) {
    this._ua.socket(header.to.url, header.body, socket)
}

Denizen.prototype._run = cadence(function (async) {
    this._destructible.stack(async, 'kibitzer')(function (ready) {
        this._destructible.addDestructor('kibitzer', this.kibitzer, 'destroy')
        this.kibitzer.listen(async())
        ready.unlatch()
    })
    this._destructible.stack(async, 'log')(function (ready) {
        this._destructible.addDestructor('colleague', this._colleague, 'destroy')
        this._colleague.pump(this._conference)
        this._colleague.log(ready, async())
    })
    this._destructible.rescue(async, 'events')(function () {
        this.shifter = this.kibitzer.log.shifter()
    })
})

Denizen.prototype.bootstrap = cadence(function (async) {
    this._run(async())
    this._destructible.rescue(async, 'bootstrap')(function () {
        async(function () {
            this._colleague.getProperties(async())
        }, function (properties) {
            properties.url = this.kibitzer.paxos.id
            this.kibitzer.bootstrap(this._Date.now(), properties)
        })
    })
    this._destructible.ready.wait(this.ready, 'unlatch')
})

Denizen.prototype.join = cadence(function (async, leader, republic) {
    this._run(async())
    this._destructible.rescue(async, 'join')(function () {
        async(function () {
            this._colleague.getProperties(async())
        }, function (properties) {
            properties.url = this.kibitzer.paxos.id
            this.kibitzer.join({ url: leader, republic: republic }, properties, async())
        })
    })
    this._destructible.ready.wait(this.ready, 'unlatch')
})

Denizen.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Denizen
