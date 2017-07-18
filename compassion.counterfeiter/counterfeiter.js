var cadence = require('cadence')
var abend = require('abend')
var Destructor = require('destructible')
var UserAgent = require('./ua')
var Denizen = require('./denizen')
var interrupt = require('interrupt').createInterrupter('compassion.counterfeiter')
var Conduit = require('compassion.conduit/conduit')
var Signal = require('signal')

function Counterfeiter (address, port) {
    this._denizens = {}
    // TODO Getting silly, just expose Denizen.
    this.events = {}
    this.kibitzers = {}
    this.loggers = {}
    this._port = port
    this._address = address
    this._destructible = new Destructor('counterfeiter')
    this._destructible.markDestroyed(this, 'destroyed')
}

Counterfeiter.prototype.bootstrap = cadence(function (async, options) {
    interrupt.assert(!this.destroyed, 'destroyed', {}, this._destructible.errors[0])
    var denizen = this._denizens[options.id] = new Denizen(this, options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer
    this.events[options.id] = denizen.kibitzer.log.shifter()
    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    this.loggers[options.id] = denizen.logger.shifter()
    denizen.bootstrap(this._port, this._address, this._destructible.rescue([ 'denizen', options.id ]))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.join = cadence(function (async, options) {
    interrupt.assert(!this.destroyed, 'destroyed', this._destructible.errors[0])
    // TODO Fold UserAgent into Counterfeiter.
    var denizen = this._denizens[options.id] = new Denizen(this, options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer

    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    this.loggers[options.id] = denizen.logger.shifter()
    console.log('JOIN')
    denizen.join(this._port, this._address, options.leader, options.republic, this._destructible.rescue([ 'denizen', options.id ], denizen.ready, 'unlatch'))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.leave = function (id) {
    interrupt.assert(!this.destroyed, 'destroyed', {}, this._destructible.errors[0])
    this._destructible.invokeDestructor([ 'denizen', id ])
}

Counterfeiter.prototype.destroy = function () {
    this._destructible.destroy()
}

Counterfeiter.prototype.listen = cadence(function (async, port, address) {
    this._address = address
    this._port = port
    var ready = new Signal
    var conduit = new Conduit
    this._destructible.addDestructor('conduit', conduit, 'destroy')
    conduit.ready.wait(ready, 'unlatch')
    conduit.listen(port, address, this._destructible.monitor('conduit', ready, 'unlatch'))
    ready.wait(async())
})

Counterfeiter.prototype.completed = function (callback) {
    this._destructible.completed(5000, callback)
}

module.exports = Counterfeiter
