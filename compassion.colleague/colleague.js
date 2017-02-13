var delta = require('delta')
var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')

function Dispatcher (colleague) {
    this._colleague = colleague
}

Dispatcher.prototype.fromBasin = cadence(function (async, envelope) {
    async(function () {
    }, function () {
    })
})

function Colleague (kibitzer) {
    this._kibitzer = kibitzer
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
}

Colleague.prototype._listen = cadence(function (async) {
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

Colleague.prototype.listen = cadence(function (async, input, output) {
    this._destructor.destructable(cadence(function (async) {
        this._multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
        this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
        this._multiplexer.listen(async())
    }).bind(this), async())
})

Colleague.prototype.destroy = function () {
    this._destructor.destroy()
}

Colleague.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(new Basin(new Dispatcher(this)))
})

module.exports = Colleague
