var cadence = require('cadence')
var Destructor = require('destructible')
var Conduit = require('conduit')
var Signal = require('signal')
var Caller = require('conduit/caller')
var Procession = require('procession')
var Multiplexer = require('conduit/multiplexer')

function Channel (kibitzer) {
    this.read = new Procession
    this.write = new Procession

    this._channel = null
    this._kibitzer = kibitzer
    this._destructor = new Destructor('channel')
    this._destructor.markDestroyed(this, 'destroyed')

    var multiplexer = new Multiplexer({
        conference: this._caller = new Caller
    })

    this.read = multiplexer.read
    this.write = multiplexer.write

    this.write.shifter().pump(this, '_enqueue')

    this._write = this.read

    // TODO What is this for?
    this.chatter = new Procession

    this.ready = new Signal
    this._destructor.addDestructor('ready', this.ready, 'unlatch')
}

Channel.prototype._enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this.chatter.push(envelope)
    switch (envelope.method) {
    case 'naturalized':
        // this._kibitzer.naturalize()
        break
    case 'reduce':
    case 'broadcast':
        // this._channel._kibitzer.publish(envelope)
        break
    default: // (pipe, boundary, record, retry)
        // For these cases, it was enough to record them.
        break
    }
})

Channel.prototype.pump = function (conference) {
    this.read.shifter().pump(conference.write, 'enqueue')
    conference.read.shifter().pump(this.write, 'enqueue')
}

Channel.prototype.destroy = function () {
    this._destructor.destroy()
}

Channel.prototype.getProperties = cadence(function (async, id) {
    async(function () {
        this._caller.invoke({
            module: 'colleague',
            method: 'properties',
            body: { id: id, replaying: true }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

module.exports = Channel
