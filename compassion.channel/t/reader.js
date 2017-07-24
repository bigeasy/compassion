require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Reader = require('../reader')
    var Procession = require('procession')
    var stream = require('stream')

    var reader = new Reader
    var queue = new Procession
    var shifter = queue.shifter()

    var input = new stream.PassThrough

    input.write(JSON.stringify(1) + '\n')
    input.end()

    async(function () {
        reader.read(input, queue, async())
    }, function () {
        okay([ shifter.shift(), shifter.shift() ], [ 1, null ], 'read')
    })
}
