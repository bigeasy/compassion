require('proof/redux')(1, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var bin = require('../channel.bin')
    assert(bin, 'required')
    return
    var path = require('path')
    var log = path.join(__dirname, 'fixtures/log.json')
    var program
    async(function () {
        bin({
            log: log,
            island: 'island',
            id: '1',
            argv: [ 'example' ]
        }, async())
    }, function () {
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
