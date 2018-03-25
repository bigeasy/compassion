module.exports = function (Colleague, Conduit) {
    var cadence = require('cadence')
    var abend = require('abend')
    var Colleague = require('../compassion.colleague/colleague')
    var Extracted = require('../compassion.colleague/extracted')
    var Kibitzer = require('kibitz')
    var Vizsla = require('vizsla')
    var Signal = require('signal')
    var Procession = require('procession')
    var Recorder = require('./recorder')

    var assert = require('assert')

    var interrupt = require('interrupt').createInterrupter('compassion.counterfeiter')

    function Counterfeiter (destructible) {
        this._colleagues = {}
        // TODO Getting silly, just expose Denizen.
        this.events = {}
        this.loggers = {}
        this._instance = 0
        this._destructibles = {}
        this._destructible = destructible
        this._destructible.markDestroyed(this, 'destroyed')
        this._destructible.completed.wait(function (error) {
            if (error) {
                console.log(error.stack)
            }
        })
        this._destructible.destruct.wait(function () {
            console.log('GOT THE KILLING!')
        })
    }

    Counterfeiter.prototype._run = cadence(function (async, destructible, options) {
        // Create loggers suitable for replaying.
        var logger = new Procession

        this._destructibles[options.id] = destructible

        destructible.destruct.wait(function () {
            console.log('DESTRUCTING!!!', options.id)
        })

        this.loggers[options.id] = logger.shifter()

        async(function () {
            destructible.monitor('colleague', Extracted, {
                id: options.id,
                ping: 1000,
                conduit: 'http://127.0.0.1:8888',
                island: 'island',
                timeout: 3000,
                httpTimeout: 1000,
                recorder: function (name) { return new Recorder(name, logger) }
            }, async())
        }, function (multiplexer, colleague) {
            var consumed = new Procession()

            this.events[options.id] = consumed.shifter()

            var Pump = require('procession/pump')
            var events = colleague.kibitzer.log.shifter()
            var shifter = null
            new Pump(shifter = colleague.kibitzer.log.shifter(), function (entry) {
                multiplexer.read.push({ method: 'entry', body: entry })
            }).pumpify(destructible.monitor('entry'))
            destructible.destruct.wait(shifter, 'destroy')
            destructible.destruct.wait(function () {
                multiplexer.read.push(null)
                multiplexer.write.push(null)
            })

            // Connect colleague directly to conference.
            multiplexer.read.shifter().pumpify(options.conference.write)

            /*
            new Pump(colleague.kibitzer.paxos.log.shifter(), function (envelope) {
            }).pumpify(destructible.monitor('dump'))
            */

            new Pump(multiplexer.write.shifter(), colleague, 'read').pumpify(destructible.monitor('colleague'))

            options.conference.read.shifter().pump(multiplexer.write, 'enqueue')
            options.conference.read.shifter().pump(function (comeback) {
                if (comeback.method == 'consumed') {
                    console.log('consumified', comeback)
                    consumed.push(events.shift())
                }
            })
            destructible.destruct.wait(function () {
                console.log('will null!!!!!!!')
                consumed.push(null)
            })

            this._colleagues[options.id] = colleague
        })
    })

    // TODO This is half-baked. Chaperon has same logic in different package.
    Counterfeiter.prototype.bootstrap = cadence(function (async, options) {
        async(function () {
            this._destructible.monitor([ 'conference', this._instance++ ], true, this, '_run', options, async())
        }, function (colleague) {
            // TODO Use HTTP instead.
            var url = 'http://127.0.0.1:8888/' + options.id + '/'
            this._colleagues[options.id].bootstrap(options.republic, url, async())
        }, function () {
            console.log('----- done')
        })
    })

    Counterfeiter.prototype.join = cadence(function (async, options) {
        require('assert')(options.republic != null)
        async(function () {
            this._destructible.monitor([ 'conference', this._instance++ ], true, this, '_run', options, async())
        }, function (colleague) {
            var leader = 'http://127.0.0.1:8888/' + options.leader + '/'
            var url = 'http://127.0.0.1:8888/' + options.id + '/'
            this._colleagues[options.id].join(options.republic, leader, url, async())
        }, function () {
            console.log('joined')
        })
    })

    Counterfeiter.prototype.leave = function (id) {
        interrupt.assert(!this.destroyed, 'destroyed', {})
        this._destructibles[id].destroy()
        delete this._destructible[id]
    }

    Counterfeiter.prototype.destroy = function () {
        this._destructible.destroy()
    }

    // TODO You should just listen here.
    Counterfeiter.prototype.listen = cadence(function (async, port, address) {
        async(function () {
        }, function () {
            conduit.listen(port, address, this._destructible.monitor('conduit'))
        })
    })

    Counterfeiter.prototype.completed = function (callback) {
        this._destructible.completed.wait(callback)
    }

    return cadence(function (async, destructible, port, address) {
        async(function () {
            destructible.monitor('conduit', Conduit, port, address, async())
        }, function () {
            return new Counterfeiter(destructible)
        })
    })
}
