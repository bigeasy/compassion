require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var Merger = require('../merger')
    assert(Merger, 'require')
}
