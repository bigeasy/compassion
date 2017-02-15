var delta = require('delta')
var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')
var Basin = require('conduit/basin')
var Spigot = require('conduit/spigot')
var Signal = require('signal')
var Requester = require('conduit/requester')
var Procession = require('procession')

function Colleague (kibitzer) {
    this._kibitzer = kibitzer
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._spigot = new Spigot(this)
    this._requester = new Requester('colleague')
    this._spigot.emptyInto(this._requester.basin)
    this.connected = new Signal
    this.events = new Procession
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
    this._destructor.addJanitor('unconnected', function () { this.connected.notify() }.bind(this))
    delta(this._destructor.callback()).ee(child).on('exit')
    multiplexer.listen(this._destructor.callback())
})

Colleague.prototype.listen = cadence(function (async, input, output) {
    this._destructor.destructible(cadence(function (async) {
        this._multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
        this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
        this._multiplexer.listen(async())
    }).bind(this), async())
})

Colleague.prototype.destroy = function () {
    this._destructor.destroy()
}

Colleague.prototype.fromBasin = cadence(function (async, envelope) {
})

Colleague.prototype.fromSpigot = cadence(function (async, envelope) {
})

Colleague.prototype.getProperties = cadence(function (async) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: null
        }, async())
    }, function (properties) {
        this.events.push({
            module: 'compassion.colleague',
            method: 'properties',
            body: properties
        })
        return [ properties ]
    })
})

Colleague.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(this._requester.basin)
    this._requester.spigot.emptyInto(socket.basin)
    this.connected.notify()
})

module.exports = Colleague
