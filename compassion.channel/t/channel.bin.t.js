require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var bin = require('../channel.bin')
    var path = require('path')
    var example = path.join(__dirname, 'fixtures/example.js')
    var log = path.join(__dirname, 'fixtures/log.json')
    var program
    async(function () {
        async(function () {
            program = bin({
                log: log,
                island: 'island',
                id: '1',
                argv: [ 'node', example ]
            }, async())
        }, function () {
            console.log('done')
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
