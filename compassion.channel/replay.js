var byline = require('byline')
var cadence = require('cadence')
var delta = require('delta')
var Staccato = require('staccato')

module.exports = cadence(function (async, stream, colleague, machine) {
    colleague.replay()
    var staccato = new Staccato(byline(stream))
    var loop = async(function () {
        staccato.read(async())
    }, function (line) {
        if (line == null) {
            return [ loop.break ]
        }
        if (/^{"/.test(line.toString())) {
            colleague.play(JSON.parse(line.toString()), machine, async())
        }
    })()
})
