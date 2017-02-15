var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')
var Signal = require('signal')
var Requester = require('conduit/requester')

function Channel () {
    this._destructor = new Destructor
    this.connected = new Signal
    this._requester = new Requester('colleague')
}

Channel.prototype.listen = cadence(function (async, input, output) {
    this._destructor.destructible(cadence(function (async) {
        this._multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
        this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
        this._multiplexer.listen(async())
    }).bind(this), async())
})

Channel.prototype.destroy = function () {
    this._destructor.destroy()
}

Channel.prototype._connect = cadence(function (async, socket) {
    console.log('--- _connect ---')
    socket.spigot.emptyInto(this._requester.basin)
    this._requester.spigot.emptyInto(socket.basin)
    this.connected.notify()
})

module.exports = Channel
