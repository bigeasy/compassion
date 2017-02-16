var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')
var Signal = require('signal')
var Requester = require('conduit/requester')
var Spigot = require('conduit/spigot')
var Basin = require('conduit/basin')
var Procession = require('procession')
var assert = require('assert')

function Conduit (colleague) {
    this._colleague = colleague
}

function Conference (channel) {
    this._channel = channel
}

Conference.prototype.fromBasin = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this._channel.chatter.push(envelope)
    switch (envelope.method) {
    case 'boundary':
    case 'record':
        // For these cases, it was enough to record them.
        break
    case 'request':
        this._kibitzer.publish({
            module: 'compassion.colleague',
            method: request,
            from: this.kibitzer.paxos.id,  // This or maybe the naturalized id.
            body: envelope.body
        })
        break
    case 'response':
        this.responses.push(response)
        break
    case 'naturalized':
        this._kibitzer.naturalize()
        break
    case 'broadcast':
    case 'reduce':
        // this._channel._kibitzer.publish(envelope)
        break
    }
})

Conference.prototype.fromSpigot = cadence(function (async, envelope) {
    assert(envelope == null)
})

function Channel (kibitzer) {
    this.connected = new Signal

    this._kibitzer = kibitzer
    this._requester = new Requester('colleague')
    this._multiplexer = null
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')

    this.spigot = new Spigot(new Conference(this))
    this._requester = new Requester('colleague')
    this.spigot.emptyInto(this._requester.basin)

    this._basin = new Basin(new Conference(this))

    this.requests = new Procession
    this.chatter = new Procession
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
    callback()
}

Channel.prototype.destroy = function () {
    this._destructor.destroy()
}

Channel.prototype._connect = cadence(function (async, socket) {
    this._requester.spigot.emptyInto(socket.basin)
    socket.spigot.emptyInto(this._basin)
    this.connected.notify()
})

Channel.prototype.getProperties = cadence(function (async) {
    this._requester.request('colleague', {
        module: 'colleague',
        method: 'properties',
        body: null
    }, async())
})

Channel.prototype.getProperties = cadence(function (async, id) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: { id: id, replaying: false }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

module.exports = Channel
