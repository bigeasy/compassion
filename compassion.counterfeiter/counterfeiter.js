var cadence = require('cadence')
var abend = require('abend')
var Destructor = require('destructible')
var UserAgent = require('./ua')
var Denizen = require('./denizen')
var Terminator = require('destructible/terminator')

function Counterfeiter () {
    this._denizens = {}
    this.events = {}
    this.kibitzers = {}
    this._destructible = new Destructor('counterfeiter')
    this._destructible.markDestroyed(this, 'destroyed')
    this._destructible.events.pump(new Terminator(1000), 'push')
    this.done = this._destructible.done
}

Counterfeiter.prototype.bootstrap = cadence(function (async, options) {
    var denizen = this._denizens[options.id] = new Denizen(options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer
    this.events[options.id] = denizen.kibitzer.log.shifter()
    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    denizen.bootstrap(this._destructible.rescue([ 'denizen', options.id ]))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.join = cadence(function (async, options) {
    var denizen = this._denizens[options.id] = new Denizen(options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer
    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    denizen.join(options.leader, options.republic, this._destructible.rescue([ 'denizen', options.id ]))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.stop = function (identifier) {
    this._destructible.invokeDestructor([ 'denizen', identifier ])
}

Counterfeiter.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Counterfeiter
