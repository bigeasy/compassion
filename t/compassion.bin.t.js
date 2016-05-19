require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../compassion.bin')
    var io
    async(function () {
        io = bin({}, [ '--bind', '127.0.0.1:8888', '--module', './t/child' ], {}, async())
    }, function () {
        assert(true, 'started')
        io.events.emit('SIGINT')
    })
}
