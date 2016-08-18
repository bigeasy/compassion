require('proof/redux')(2, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var bin = require('../channel.bin')
    var program
    async(function () {
        bin({
            log: 't/fixtures/log.json',
            island: 'island',
            id: '1',
            argv: [ 'example' ]
        }, async())
    }, function () {
        assert(true, 'started')
        program = bin({
            log: '-',
            island: 'island',
            id: '1',
            argv: [ 'example' ]
        }, {
            stdin: fs.createReadStream('t/fixtures/log.json')
        }, async())
    }, function () {
        assert(true, 'started')
    })
}
