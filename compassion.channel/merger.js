var Procession = require('procession')
var Throttle = require('procession/throttle')
var cadence = require('cadence')
var departure = require('departure')
var Destructor = require('destructible')
var interrupt = require('interrupt').createInterrupter('compassion.channel')

function Merger (kibitzer, channel) {
    this._replay = this.replay = new Procession
    this.replay = new Throttle(this._replay = new Procession, 1)
    this.play = new Procession
    this._destructor = new Destructor
    this._kibitzer = kibitzer
    this._channel = channel
}

Merger.prototype.merge = cadence(function (async) {
    var replay = this._replay.shifter()
    var play = this.play.shifter()
    var loop = async(function () {
        replay.dequeue(async())
    }, function (replayed) {
        console.log('replayed', replayed)
        if (replayed == null) {
            return [ loop.break ]
        }
        switch (replayed.source) {
        case 'kibitz':
            this._kibitzer.replay(replayed.$envelope, async())
            break
        }
        async(function () {
            play.dequeue(async())
        }, function (played) {
            console.log('played', played)
            if (played == null) {
                throw interrupt('mismatch', {
                    expected: replayed,
                    actual: played
                })
            }
            departure.raise(played.$envelope, replayed.$envelope)
        })
    })()
})

module.exports = Merger
