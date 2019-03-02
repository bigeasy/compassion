require('proof')(1, require('cadence')(prove))

require('compassion.test')

function prove (async, okay) {
    var supervisor = require('../compassion.bin')

    var io
    async(function () {
        io = supervisor([ 'test', 'a' ], {}, async())
    }, function (code) {
        okay(code, 0, 'code')
    })
}
