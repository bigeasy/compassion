var cadence = require('cadence')
var Destructor = require('destructible')
var Conduit = require('conduit')
var Signal = require('signal')
var Requester = require('conduit/requester')
var Procession = require('procession')
var assert = require('assert')

function Conduit (colleague) {
    this._colleague = colleague
}

function Conference (channel) {
    this._channel = channel
}

Channel.prototype._enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this.chatter.push(envelope)
    switch (envelope.method) {
    case 'boundary':
    case 'record':
    case 'retry':
        // For these cases, it was enough to record them.
        break
    case 'response':
        this.responses.push(response)
        break
    case 'naturalized':
        // this._kibitzer.naturalize()
        break
    case 'broadcast':
    case 'reduce':
        // this._channel._kibitzer.publish(envelope)
        break
    }
})

function Channel (kibitzer) {
    this.read = new Procession
    this.write = new Procession

    this._channel = null
    this._kibitzer = kibitzer
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')

    this._requester = new Requester('colleague', this.read, this.write)

    this._requester.read.pump(this, '_enqueue')

    this.requests = new Procession
    this.chatter = new Procession
    this.responses = new Procession

    this.ready = new Signal
    this._destructor.addDestructor('ready', this.ready, 'unlatch')
}

Channel.prototype.pump = function (read, write) {
    this.write.pump(read, 'enqueue')
    write.pump(this.read, 'enqueue')
}

Channel.prototype.listen = cadence(function (async, input, output) {
    this._conduit = new Conduit(input, output)
    this._conduit.ready.wait(this.ready, 'unlatch')
    this.pump(this._conduit.write, this._conduit.read)
    this._destructor.addDestructor('conduit', this._conduit.destroy.bind(this._conduit))
    this._conduit.listen(this._destructor.monitor('conduit'))
    this._destructor.completed(async())
})

Channel.prototype.destroy = function () {
    this._destructor.destroy()
}

Channel.prototype._connect = cadence(function (async, socket) {
    this._requester.spigot.emptyInto(socket.basin)
    socket.spigot.emptyInto(this.basin)
    this.connected.notify()
})

Channel.prototype.getProperties = cadence(function (async, id) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: { id: id, replaying: true }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

module.exports = Channel
