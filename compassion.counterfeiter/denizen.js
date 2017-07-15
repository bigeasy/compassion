var cadence = require('cadence')
var Responder = require('conduit/responder')
var Destructible = require('destructible')
var Signal = require('signal')
var Colleague = require('compassion.colleague/colleague')
var Kibitzer = require('kibitz')
var Timer = require('happenstance').Timer
var Procession = require('procession')
var Recorder = require('./recorder')
var Thereafter = require('thereafter')

function Denizen (counterfeiter, options, ua) {
    this._counterfeiter = counterfeiter
    var kibitzer = this.kibitzer = new Kibitzer({ id: options.id, ping: 250, timeout: 1000 })
    kibitzer.paxos.scheduler.events.shifter().pump(new Timer(kibitzer.paxos.scheduler), 'enqueue')
    var responder = new Responder(ua)
    kibitzer.read.shifter().pump(responder.write, 'enqueue')
    responder.read.shifter().pump(kibitzer.write, 'enqueue')
    this._ua = ua
    this._colleague = new Colleague(null, kibitzer, [ this, '_socket' ])
    this._conference = options.conference
    this._identifier = options.id
    this._destructible = new Destructible([ 'denizen', options.id ])
    this._thereafter = new Thereafter
    this._destructible.addDestructor('thereafter', this._thereafter, 'cancel')
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('network', this, '_leaveNetwork')
    var logger = this.logger = new Procession
    var done = false
    kibitzer.played.shifter().pump(new Recorder('kibitz', logger), 'push')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger), 'push')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger), 'push')
    this._colleague.chatter.shifter().pump(new Recorder('colleague', logger), 'push')
    this.listening = new Signal
    this._Date = Date
    this.ready = new Signal
}

Denizen.prototype._leaveNetwork = function () {
    delete this._counterfeiter._denizens[this._identifier]
}

Denizen.prototype._socket = function (header) {
    return this._ua.socket(header.to.url, header.body)
}

Denizen.prototype._run = function () {
    this._thereafter.run(this, function (ready) {
        this._destructible.addDestructor('kibitzer', this.kibitzer, 'destroy')
        this.kibitzer.ready.wait(ready, 'unlatch')
        this.kibitzer.listen(this._destructible.monitor('kibitzer'))
    })
    this._thereafter.run(this, function (ready) {
        this._destructible.addDestructor('colleague', this._colleague, 'destroy')
        this._colleague.read.shifter().pump(this._conference.write, 'enqueue')
        this._conference.read.shifter().pump(this._colleague.write, 'enqueue')
        this._colleague.ready.wait(ready, 'unlatch')
        this._colleague.listen(this._destructible.monitor('colleague'))
    })
    this._thereafter.run(this, function (ready) {
        this.shifter = this.kibitzer.log.shifter()
        ready.unlatch()
    })
}

Denizen.prototype._bootstrap = cadence(function (async, ready) {
    async(function () {
        this._colleague.getProperties(async())
    }, function (properties) {
        properties.url = this.kibitzer.paxos.id
        this.kibitzer.bootstrap(this._Date.now(), properties)
        ready.unlatch()
    })
})

Denizen.prototype.bootstrap = cadence(function (async) {
    this._run()
    this._thereafter.run(this, function (ready) {
        this._bootstrap(ready, this._destructible.rescue('bootstrap'))
    })
    this._thereafter.ready.wait(this.ready, 'unlatch')
    this._destructible.completed(1000, async())
})

Denizen.prototype._join = cadence(function (async, ready, leader, republic) {
    async(function () {
        this._colleague.getProperties(async())
    }, function (properties) {
        properties.url = this.kibitzer.paxos.id
        this.kibitzer.join({ url: leader, republic: republic }, properties, async())
    }, function () {
        ready.unlatch()
    })
})

Denizen.prototype.join = cadence(function (async, leader, republic) {
    this._run()
    this._thereafter.run(this, function (ready) {
        this._join(ready, leader, republic, this._destructible.rescue('join'))
    })
    this._thereafter.ready.wait(this.ready, 'unlatch')
    this._destructible.completed(1000, async())
})

Denizen.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Denizen
