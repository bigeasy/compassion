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
    this._kibitzer = kibitzer
    this._channel = channel
}

Merger.prototype._entry = cadence(function (async, splitter, outboxes, log) {
    var loop = async(function () {
        splitter.dequeue('paxos', async())
    }, function (entry) {
        if (entry == null) {
            return [ loop.break, null ]
        }
        var envelope = entry.$envelope
        switch (entry.source) {
        case 'kibitz':
            this._kibitzer.replay(envelope, async())
            break
        case 'paxos':
            departure.raise(outboxes.paxos.shift(), envelope)
            break
        case 'islander':
            departure.raise(outboxes.islander.shift(), envelope)
            break
        }
    }, function () {
        if (log.peek() != null) {
            return [ loop.break, log.shift() ]
        }
    })()
})

Merger.prototype.merge = cadence(function (async) {
    var responses = this._channel.responses.shifter()
    var chatter = this._channel.chatter.shifter()
    // var chatter = this._channel.chatter.shifter()
    var outboxes = {
        paxos: this._kibitzer.paxos.outbox.shifter(),
        islander: this._kibitzer.islander.outbox.shifter()
    }
    var log = this._kibitzer.islander.log.shifter()
    var splitter = new Splitter(this._replay, {
        colleague: function (entry) { return entry.source == 'colleague' },
        paxos: function (entry) { return /^paxos|islander|kibitz$/.test(entry.source) }
    })
    async(function () {
        this._channel.getProperties(this._kibitzer.paxos.id, async())
    }, function (properties) {
        async(function () {
            splitter.dequeue('paxos', async())
        }, function (entry) {
            var envelope = entry.$envelope
            switch (envelope.method) {
            case 'bootstrap':
                properties.url = envelope.body.properties.url
                departure.raise(properties, envelope.body.properties)
                this._kibitzer.replay(envelope, async())
                break
            }
        }, function () {
            this._entry(splitter, outboxes, log, async())
        }, function (entry) {
            departure.raise(entry.promise, '0/0')
        })
    }, function () {
        var loop = {}
        loop.colleague = async(function () {
            splitter.dequeue('colleague', async())
        }, function (entry) {
            if (entry == null) {
                return [ loop.colleague.break ]
            }
            var envelope = entry.$envelope
            if (envelope.method == 'boundary') {
                async(function () {
                    if (envelope.body.name == '_entry') {
                        async(function () {
                            this._entry(splitter, outboxes, log, async())
                        }, function (entry) {
                            this._channel.spigot.requests.enqueue(entry && {
                                module: 'colleague',
                                method: 'entry',
                                body: entry
                            }, async())
                        })
                    }
                }, function () {
                    var cookie = envelope.id
                    chatter.join(function (envelope) {
                        return envelope.method == 'boundary' && envelope.id == cookie
                    }, async())
                }, function (found) {
                    assert(found)
                })
            }
        })()
    })
})

module.exports = Merger
