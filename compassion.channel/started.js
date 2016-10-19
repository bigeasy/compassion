module.exports = require('cadence')(function (async, staccato, island, id) {
    var loop = async(function () {
        staccato.read(async())
    }, function (line) {
        if (line == null) {
            return [ loop.break ]
        }
        var entry = JSON.parse(line.toString())
        if (entry.qualified == 'compassion.colleague#started') {
            return [ loop.break, entry ]
        }
    })()
})
