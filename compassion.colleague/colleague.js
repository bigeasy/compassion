var delta = require('delta')
var cadence = require('cadence')
var Destructor = require('destructible')
var Multiplexer = require('conduit/multiplexer')
var Basin = require('conduit/basin')
var Spigot = require('conduit/spigot')
var Signal = require('signal')
var Requester = require('conduit/requester')
var Procession = require('procession')
var assert = require('assert')

function Conduit (colleague) {
    this._colleague = colleague
}

function Conference (colleague) {
    this._colleague = colleague
}

Conference.prototype.fromBasin = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this._colleague.chatter.push({
        module: 'compassion.colleague',
        method: 'request',
        body: envelope
    })
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
        this._colleague._kibitzer.publish(envelope)
        break
    }
})

Conference.prototype.fromSpigot = cadence(function (async, envelope) {
    assert(envelope == null)
})


function Colleague (kibitzer) {
    this._kibitzer = kibitzer
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._spigot = new Spigot(new Conference(this))
    this._requester = new Requester('colleague')
    this._spigot.emptyInto(this._requester.basin)
    this._basin = new Basin(new Conference(this))
    this.connected = new Signal
    this.chatter = new Procession
    this.responses = new Procession
    this.responses.pump({ object: this, method: '_response' })
    this.demolition = this._destructor.events
}

Colleague.prototype._response = cadence(function (async, envelope) {
    async(function () {
    }, function () {
    })
})

Colleague.prototype.listen = cadence(function (async, input, output) {
    this._destructor.async(async, 'multiplexer')(function () {
        this._multiplexer = new Multiplexer(input, output, { object: this, method: '_connect' })
        this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
        this._multiplexer.listen(async())
    })
    this._destructor.async(async, 'log')(function () {
        var shifter = this._kibitzer.islander.log.shifter()
        this._destructor.addDestructor('log', shifter.destroy.bind(shifter))
        async(function () {
            shifter.dequeue(async())
        }, function (entry) {
            if (entry == null) {
                return
            }
            assert(entry.promise == '0/0')
            var loop = async(function () {
                shifter.dequeue(async())
            }, function (entry) {
                async(function () {
                    this._spigot.requests.enqueue(entry && {
                        module: 'colleague',
                        method: 'entry',
                        body: entry
                    }, async())
                }, function () {
                    if (entry == null) {
                        return [ loop.break ]
                    }
                })
            })()
        })
    })
})

Colleague.prototype.destroy = function () {
    this._destructor.destroy()
}

Colleague.prototype.getProperties = cadence(function (async) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: {
                id: this._kibitzer.paxos.id,
                replaying: false
            }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

Colleague.prototype._connect = cadence(function (async, socket) {
    this._requester.spigot.emptyInto(socket.basin)
    socket.spigot.emptyInto(this._basin)
    this.connected.notify()
})

module.exports = Colleague
