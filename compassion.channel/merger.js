var Procession = require('procession')
var Throttle = require('procession/throttle')
var cadence = require('cadence')
var Destructor = require('destructible')

function Merger (kibitzer, channel) {
    this.log = new Procession
    this._destructor = new Destructor
    this._kibitzer = kibitzer
    this._channel = channel
}

Merger.prototype.replay = cadence(function (async) {
    var log = this.log.shifter()
    var loop = async(function () {
        log.dequeue(async())
    }, function (entry) {
        if (entry == null) {
            return [ loop.break ]
        }
        if (entry.$envelope.module == 'kibitz') {
            this._kibitzer.replay(entry.$envelope, async())
        }
    })()
})

module.exports = Merger
