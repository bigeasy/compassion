require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../colleague.bin')

    var fs = require('fs')
    var path = require('path')

    var abend = function (error) { if (error) throw error }

    var example = path.join(__dirname, 'fixtures/example.js')

    var conduit, chaperon, mingle
    async(function () {
        var Conduit = require('compassion.conduit/conduit.bin')
        conduit = Conduit({ bind: '127.0.0.1:8808' }, abend)
        conduit.ready.wait(async())
    }, [function () {
        conduit.emit('SIGTERM')
    }], function () {
        var Mingle = require('mingle.static/static.bin')
        mingle = Mingle([
            '--bind=127.0.0.1:8888', '127.0.0.1:8808'
        ], abend)
        mingle.ready.wait(async())
    }, [function () {
        mingle.emit('SIGTERM')
    }], function () {
        var Chaperon = require('chaperon/chaperon.bin')
        chaperon = Chaperon({
            bind: '127.0.0.1:8088',
            mingle: 'http://127.0.0.1:8888',
            conduit: 'http://127.0.0.1:8808'
        }, abend)
        chaperon.ready.wait(async())
    }, [function () {
        chaperon.emit('SIGTERM')
    }], function () {
        console.log('here')
        var io = bin({
            conduit: 'http://127.0.0.1:8808',
            chaperon: 'http://127.0.0.1:8088',
            island: 'island',
            id: '1',
            argv: [ 'node', example ]
        }, { env: process.env }, async())
        async(function () {
            io.ready.wait(async())
        }, function () {
            io.emit('SIGTERM')
        })
    }, function () {
        assert(true, 'ran')
    })
}
