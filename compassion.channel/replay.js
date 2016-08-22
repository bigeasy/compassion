var byline = require('byline')
var cadence = require('cadence')
var delta = require('delta')

module.exports = cadence(function (async, stream, colleague) {
    async(function () {
        colleague.replay()
        delta(async())
            .ee(byline(stream))
            .on('data', function (line) {
                if (/^{"/.test(line.toString())) {
                    colleague.play(JSON.parse(line.toString()))
                }
            })
            .on('end')
    }, function () {
        console.log('ENDED')
    })
})
