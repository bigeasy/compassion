var cadence = require('cadence')

var departure = require('departure')

var Throttle = require('procession/throttle')
var Procession = require('procession')

var Destructor = require('destructible')

var interrupt = require('interrupt').createInterrupter('compassion.channel')

var Splitter = require('procession/splitter')

var assert = require('assert')

function Merger (kibitzer, channel) {
    this._replay = this.replay = new Procession
    this.replay = new Throttle(this._replay = new Procession, 1)
    this.play = new Procession
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._kibitzer = kibitzer
    this._channel = channel
}

Merger.prototype.destroy = function () {
    this._destructor.destroy()
}

// TODO In order to play long running government you're going to have to consume
// the ping messages. On the other hand, you might have an application that is
// generating a lot of application log records, so you can't simply move through
// the paxos log and neglect the application log.
//
// Rather than pulling, you might read though and push into two separate
// queues, but trying to keept he queues full made us choose pull in the first
// place.
//
// We can read though the log and build the atomic log. We know that events
// entered into the log will be consumed soon after they materialize in the log.
// Thus, we can push those events onto a queue. There's no way for us to reach
// an entry boundary without already having materialized the entry.
//
// Any records or requests can be played as they are encountered.

//
Merger.prototype.merge = cadence(function (async) {
    var responses = this._channel.responses.shifter()
    var chatter = this._chatter = this._channel.chatter.shifter()
    var replay = this._replay = this._replay.shifter()
    this._destructor.addDestructor('chatter', { object: chatter, method: 'destroy' })
    this._destructor.addDestructor('replay', { object: replay, method: 'destroy' })
    // var chatter = this._channel.chatter.shifter()
    var outboxes = {
        paxos: this._kibitzer.paxos.outbox.shifter(),
        islander: this._kibitzer.islander.outbox.shifter()
    }
    var log = this._kibitzer.islander.log.shifter()
    async(function () {
        this._channel.getProperties(this._kibitzer.paxos.id, async())
    }, function (properties) {
        async(function () {
            replay.dequeue(async())
        }, function (entry) {
            departure.raise(entry.source, 'kibitz')
            var envelope = entry.$envelope
            switch (envelope.method) {
            case 'bootstrap':
                properties.url = envelope.body.properties.url
                departure.raise(properties, envelope.body.properties)
                this._kibitzer.replay(envelope)
                break
            case 'join':
                properties.url = envelope.body.properties.url
                departure.raise(properties, envelope.body.properties)
                this._kibitzer.replay(envelope)
                break
            }
        })
    }, function () {
        var loop = async(function () {
            replay.dequeue(async())
        }, function (entry) {
            if (entry == null) {
                return [ loop.break ]
            }
            var envelope = entry.$envelope
            switch (entry.source) {
            case 'colleague':
                switch (envelope.method) {
                case 'boundary':
                    async(function () {
                        console.log(envelope)
                        if (envelope.entry != null) {
                            var entry = log.shift()
                            departure.raise(entry.promise, envelope.entry)
                            this._channel.write.enqueue({
                                module: 'colleague',
                                method: 'entry',
                                body: entry
                            }, async())
                        }
                    }, function () {
                        console.log('JOINING', entry)
                        chatter.join(function (entry) {
                            console.log(entry)
                            return entry.id == envelope.id
                        }, async())
                    }, function (envelope) {
                        console.log('BOUNDARY FOUND', envelope)
                    })
                    break
                case 'replay':
                    console.log('sending', envelope)
                    this._channel.write.enqueue({
                        module: 'colleague',
                        method: 'replay',
                        id: envelope.id,
                        body: envelope.body
                    }, async())
                    break
                case 'record':
                    this._channel.write.enqueue({
                        module: 'colleague',
                        method: 'record',
                        body: envelope.body
                    }, async())
                    break
                }
                break
            case 'kibitz':
                this._kibitzer.replay(envelope)
                break
            case 'paxos':
                departure.raise(outboxes.paxos.shift(), envelope)
                break
            case 'islander':
                departure.raise(outboxes.islander.shift(), envelope)
                break
            }
        })()
    }, function () {
        console.log('DONE')
    })
})

module.exports = Merger
