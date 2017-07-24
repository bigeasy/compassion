var Destructible = require('destructible')
var cadence = require('cadence')
var Signal = require('signal')
var byline = require('byline')
var Staccato = require('staccato')

function Reader () {
    this._destructible = new Destructible('reader')
    this.ready = new Signal
}

Reader.prototype.read = cadence(function (async, stream, queue) {
    var readable = new Staccato.Readable(byline(stream))
    this._destructible.addDestructor('readable', readable, 'destroy')
    var loop = async(function () {
        readable.read(async())
        this.ready.unlatch()
    }, function (line) {
        async(function () {
            queue.enqueue(line && JSON.parse(line.toString()), async())
        }, function () {
            if (line == null) {
                return [ loop.break ]
            }
        })
    })()
})

Reader.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Reader
