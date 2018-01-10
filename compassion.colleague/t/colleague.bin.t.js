require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../colleague.bin')

    var fs = require('fs')
    var path = require('path')

    var abend = function (error) { if (error) throw error }

    var example = path.join(__dirname, 'fixtures/example.js')

    var conduit, mingle
    async(function () {
        var Conduit = require('compassion.conduit/conduit.bin')
        conduit = Conduit({ bind: '127.0.0.1:8808' }, abend)
        conduit.ready.wait(async())
    }, [function () {
        conduit.emit('SIGTERM')
    }], function () {
        var io
        async([function () {
            io = bin({
                conduit: 'http://127.0.0.1:8808/',
                island: 'island',
                id: '1',
                argv: [ 'node', example ]
            }, { env: process.env }, async())
        }, function (error) {
            console.log(error.stack)
            throw error
        }])
        async(function () {
            io.ready.wait(async())
        }, function () {
            setTimeout(async(), 1000)
        }, function () {
            io.emit('SIGTERM')
        })
    }, function () {
        assert(true, 'ran')
    })
}
