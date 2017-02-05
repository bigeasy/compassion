var delta = require('delta')
var cadence = require('cadence')
var destructor = require('nascent.destructor')

function Dispatcher (colleague) {
    this._colleague = colleague
}

Dispatcher.prototype.fromBasin = cadence(function (async, envelope) {
    async(function () {
    }, function () {
    })
})

function Colleague (kibitzer) {
    this.basin = new Basin(new Dispatcher(this))
    this._kibitzer = kibizter
}

Colleague.prototype.listen = cadence(function (async) {
    this._destructor.destructed.wait(async())
    var env = JSON.parse(JSON.stringify(this._env))
    env.COMPASSION_COLLEAGUE_FD = '3'
    var child = children.spawn(this._command, this._argv, {
        stdio: [ 'inherit', 'inherit', 'inherit', 'pipe' ],
        env: env
    })
    var multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
    this._destructor.addJanitor('multiplexer', multiplexer.close.bind(multiplexer))
    delta(this._destructor.callback()).ee(child).on('exit')
    multiplexer.listen(this._destructor.callback())
})

Colleague.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(new Basin(new Dispatcher(this)))
})
