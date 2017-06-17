require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var bin = require('../channel.bin')
    var path = require('path')
    var log = path.join(__dirname, 'fixtures/log.json')
    var program
    async(function () {
        async(function () {
            program = bin({
                log: log,
                island: 'island',
                id: '1',
                argv: [ 'example' ]
            }, async())
        }, function () {
            console.log('done')
        })
        return
        async(function () {
            program.ready.wait(async())
        }, function () {
            console.log('done')
            program.emit('SIGTERM')
        })
    }, function () {
        return [ async.break ]
        assert(true, 'started')
        program = bin({
            island: 'island',
            id: '1',
            argv: [ 'example' ]
        }, {
            stdin: fs.createReadStream(log)
        }, async())
    }, function () {
        assert(true, 'started')
    })
}
