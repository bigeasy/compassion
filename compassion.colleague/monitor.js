var children = require('child_process')
var delta = require('delta')
var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('compassion.colleague')
var coalesce = require('extant')

var Signal = require('signal')
var Destructible = require('destructible')

function Monitor () {
    this.ready = new Signal
    this.child = null
    this.destroyed = false
    this._destructible = new Destructible
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

Monitor.prototype.run = cadence(function (async, program) {
    this._destructible.stack(async, 'run')(function (ready) {
        var argv = program.argv.slice()
        var env = JSON.parse(JSON.stringify(program.env))
        env.COMPASSION_COLLEAGUE_FD = 3
        this.child = children.spawn(argv.shift(), argv, {
            stdio: [ 'inherit', 'inherit', 'inherit', 'pipe' ],
            env: env
        })
        async(function () {
            delta(async()).ee(this.child).on('exit')
            ready.unlatch()
        }, function (exitCode, signal) {
            interrupt(exitCode == 0 || signal == 'SIGTERM', 'childExit', {
                exitCode: coalesce(exitCode),
                signal: coalesce(signal)
            })
        })
    })
    this._destructible.ready.wait(this.ready, 'unlatch')
})

Monitor.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Monitor
