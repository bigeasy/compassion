var children = require('child_process')
var delta = require('delta')
var cadence = require('cadence')

var Signal = require('signal')
var Destructor = require('destructible')

function Monitor () {
    this.started = new Signal
    this.child = null
    this.destroyed = false
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._destructor.addDestructor('started', { object: this.started, method: 'unlatch' })
}

Monitor.prototype._kill = function () {
    if (this.child != null) {
        this.child.kill()
        this.child = null
    }
}

Monitor.prototype.run = cadence(function (async, program) {
    this._destructor.async(async, 'run')(function () {
        var argv = program.argv.slice()
        var env = JSON.parse(JSON.stringify(program.env))
        env.COMPASSION_COLLEAGUE_FD = 3
        this.child = children.spawn(argv.shift(), argv, {
            stdio: [ 'inherit', 'inherit', 'inherit', 'pipe' ],
            env: env
        })
        this.started.unlatch()
        this._destructor.addDestructor('kill', { object: this, method: '_kill' })
        delta(async()).ee(this.child).on('exit')
    })
})

Monitor.prototype.destroy = function () {
    this._destructor.destroy()
}

module.exports = Monitor
