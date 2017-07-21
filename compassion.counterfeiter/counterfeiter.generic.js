module.exports = function (Colleague, Conduit) {
    var cadence = require('cadence')
    var abend = require('abend')
    var Destructor = require('destructible')
    var Colleague = require('../compassion.colleague/colleague')
    var Kibitzer = require('kibitz')
    var Conduit = require('../compassion.conduit/conduit')
    var Vizsla = require('vizsla')
    var Signal = require('signal')
    var Procession = require('procession')
    var Recorder = require('./recorder')

    var interrupt = require('interrupt').createInterrupter('compassion.counterfeiter')

    function Counterfeiter (address, port) {
        this._colleagues = {}
        // TODO Getting silly, just expose Denizen.
        this.events = {}
        this.kibitzers = {}
        this.loggers = {}
        this._port = port
        this._address = address
        this._destructible = new Destructor('counterfeiter')
        this._destructible.markDestroyed(this, 'destroyed')
    }

    Counterfeiter.prototype._run = cadence(function (async, options) {
        interrupt.assert(!this.destroyed, 'destroyed', {}, this._destructible.errors[0])
        var kibitzer = this.kibitzer = new Kibitzer({ id: options.id, ping: 1000, timeout: 3000 })

        var colleague = new Colleague(new Vizsla, kibitzer, 'island')
        this._colleagues[options.id] = colleague
        this.kibitzers[options.id] = colleague.kibitzer
        this.events[options.id] = colleague.kibitzer.log.shifter()
        this._destructible.addDestructor([ 'colleague', options.id ], colleague, 'destroy')

        // Create loggers suitable for replaying.
        var logger = new Procession

        kibitzer.played.shifter().pump(new Recorder('kibitz', logger), 'push')
        kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger), 'push')
        kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger), 'push')
        colleague.chatter.shifter().pump(new Recorder('colleague', logger), 'push')

        this._destructible.addDestructor([ 'logger', options.id ], logger, 'push')

        this.loggers[options.id] = logger.shifter()

        // Connect colleague directly to conference.
        colleague.read.shifter().pump(options.conference.write, 'enqueue')
        options.conference.read.shifter().pump(colleague.write, 'enqueue')

        // Start colleague.
        var ready = new Signal

        ready.wait(function () {
            console.log('wait wait', arguments)
        })

        colleague.ready.wait(ready, 'unlatch')
        colleague.listen(this._address, this._port, this._destructible.rescue([ 'colleague', options.id ], ready, 'unlatch'))
        ready.wait(async())
    })

    Counterfeiter.prototype.bootstrap = cadence(function (async, options) {
        async(function () {
            this._run(options, async())
        }, function (colleague) {
            this._colleagues[options.id].bootstrap(async())
        }, function () {
            console.log('done')
        })
    })

    Counterfeiter.prototype.join = cadence(function (async, options) {
        async(function () {
            this._run(options, async())
        }, function (colleague) {
            this._colleagues[options.id].join(options.republic, options.leader, async())
        }, function () {
            console.log('done')
        })
    })

    Counterfeiter.prototype.leave = function (id) {
        interrupt.assert(!this.destroyed, 'destroyed', {}, this._destructible.errors[0])
        this._destructible.invokeDestructor([ 'colleague', id ])
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

    return Counterfeiter
}
