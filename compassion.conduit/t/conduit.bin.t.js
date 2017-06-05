require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../conduit.bin')
    var program
    async(function () {
        program = bin([ '--bind', '127.0.0.1:8888' ], async())
        async(function () {
            program.ready.wait(async())
        }, function () {
            program.emit('SIGINT')
        })
    }, function () {
        assert(true, 'started')
    })
}
