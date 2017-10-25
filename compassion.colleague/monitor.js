var children = require('child_process')
var delta = require('delta')
var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('compassion.colleague')
var coalesce = require('extant')

var Signal = require('signal')
var Destructible = require('destructible')

var noop = require('nop')

function Monitor () {
    this.ready = new Signal
    this.child = null
    this.destroyed = false
    this._destructible = new Destructible(1000, 'monitor')
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('started', this.ready, 'unlatch')
    this._destructible.addDestructor('kill', this, '_kill')
}

Monitor.prototype._kill = function () {
    if (this.child != null) {
        this.child.kill()
        this.child = null
    }
}

Monitor.prototype._run = cadence(function (async, program, descendent) {
    var argv = program.argv.slice()
    var env = JSON.parse(JSON.stringify(program.env))
    env.COMPASSION_COLLEAGUE_FD = 3
    this.child = children.spawn(argv.shift(), argv, {
        stdio: [ 0, 1, 2, 'pipe', 'ipc' ],
        env: env
    })
    // At shutdown, there may be no one listening to the pipe. The Conduit might
    // get shut down so that it does not have an error handler registered. If
    // there is an error on the pipe and no one is listening it means we're
    // shutting down, so we don't really care about this error.
    this.child.stdio[3].once('error', noop)
    async([function () {
        descendent.decrement()
    }], function () {
        descendent.increment()
        descendent.addChild(this.child, null)
        delta(async()).ee(this.child).on('exit')
        this.ready.unlatch()
    }, function (exitCode, signal) {
        interrupt.assert(exitCode == 0 || signal == 'SIGTERM', 'childExit', {
            exitCode: coalesce(exitCode),
            signal: coalesce(signal)
        })
    })
})

Monitor.prototype.run = cadence(function (async, program, descendent) {
    this._run(program, descendent, this._destructible.monitor('run'))
    this._destructible.completed.wait(async())
})

Monitor.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Monitor
