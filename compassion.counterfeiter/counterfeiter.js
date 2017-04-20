var cadence = require('cadence')
var abend = require('abend')
var Destructor = require('destructible')
var UserAgent = require('./ua')
var Denizen = require('./denizen')
var Terminator = require('destructible/terminator')

function Counterfeiter () {
    this._denizens = {}
    // TODO Getting silly, just expose Denizen.
    this.events = {}
    this.kibitzers = {}
    this.loggers = {}
    this._destructible = new Destructor('counterfeiter')
    this._destructible.markDestroyed(this, 'destroyed')
    this._destructible.events.pump(new Terminator(1000), 'push')
    this.done = this._destructible.done
}

Counterfeiter.prototype.bootstrap = cadence(function (async, options) {
    var denizen = this._denizens[options.id] = new Denizen(this, options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer
    this.events[options.id] = denizen.kibitzer.log.shifter()
    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    this.loggers[options.id] = denizen.logger.shifter()
    denizen.bootstrap(this._destructible.rescue([ 'denizen', options.id ]))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.join = cadence(function (async, options) {
    // TODO Fold UserAgent into Counterfeiter.
    var denizen = this._denizens[options.id] = new Denizen(this, options, new UserAgent(this))
    this.kibitzers[options.id] = denizen.kibitzer
    this._destructible.addDestructor([ 'denizen', options.id ], denizen, 'destroy')
    this.loggers[options.id] = denizen.logger.shifter()
    denizen.join(options.leader, options.republic, this._destructible.rescue([ 'denizen', options.id ]))
    async(function () {
        denizen.ready.wait(async())
    }, function () {
        this.events[options.id] = denizen.shifter
    })
})

Counterfeiter.prototype.leave = function (id) {
    this._destructible.invokeDestructor([ 'denizen', id ])
}

Counterfeiter.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Counterfeiter
