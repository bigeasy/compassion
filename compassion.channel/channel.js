var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')
var Signal = require('signal')
var Requester = require('conduit/requester')
var Spigot = require('conduit/spigot')
var Basin = require('conduit/basin')
var Procession = require('procession')

function Channel () {
    this.connected = new Signal
    this._requester = new Requester('colleague')
    this._multiplexer = null
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._spigot = new Spigot(this)
    this._requester = new Requester('colleague')
    this._spigot.emptyInto(this._requester.basin)
    this.requests = new Procession
    this.responses = new Procession
}

Channel.prototype.listen = cadence(function (async, input, output) {
    this._destructor.destructible(cadence(function (async) {
        this._multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
        this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
        this._multiplexer.listen(async())
    }).bind(this), async())
})

Channel.prototype.fromSpigot = function (envelope, callback) {
    console.log(envelope)
    callback()
}

Channel.prototype.destroy = function () {
    this._destructor.destroy()
}

Channel.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(this._requester.basin)
    this._requester.spigot.emptyInto(socket.basin)
    this.connected.notify()
})

Channel.prototype.getProperties = cadence(function (async) {
    this._requester.request('colleague', {
        module: 'colleague',
        method: 'properties',
        body: null
    }, async())
})

module.exports = Channel
