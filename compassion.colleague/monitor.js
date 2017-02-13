var children = require('child_process')
var delta = require('delta')
var cadence = require('cadence')

var Signal = require('signal')
var Destructor = require('destructible')

function Monitor () {
    this.started = new Signal
    this.child = null
    this._destructor = new Destructor
}

Monitor.prototype.run = cadence(function (async, program) {
    async([function () {
        var argv = program.argv.slice()
        var env = JSON.parse(JSON.stringify(program.env))
        env.COMPASSION_COLLEAGUE_ID = 3
        this.child = children.spawn(argv.shift(), argv, {
            stdio: [ 'inherit', 'inherit', 'inherit', 'pipe' ],
            env: env
        })
        this.started.notify()
        this.started.open = []
        delta(async()).ee(this.child).on('exit')
        this._destructor.addDestructor('kill', function () {
            var child = this.child
            this.child.kill()
            this.child = null
            setTimeout(function () { console.log('super killing'); child.kill('SIGKILL') }, 3000).unref()
        }.bind(this))
    }, function (error) {
        this.started.notify()
        this.started.open = []
        throw error
    }])
})

Monitor.prototype.destroy = function () {
    console.log('called monitor destroy')
    this._destructor.destroy()
}

module.exports = Monitor
