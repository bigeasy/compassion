require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../channel.bin')

    var fs = require('fs')
    var path = require('path')

    var example = path.join(__dirname, 'fixtures/example.js')
    var log = path.join(__dirname, 'fixtures/log.json')

    async(function () {
        bin({
            log: log,
            island: 'island',
            id: '1',
            argv: [ 'node', example ]
        }, { env: process.env }, async())
    }, function () {
        assert(true, 'ran')
        bin({
            island: 'island',
            id: '1',
            argv: [ 'node', example ]
        }, {
            env: process.env,
            stdin: fs.createReadStream(log)
        }, async())
    }, function () {
        assert(true, 'stdin')
    })
}
