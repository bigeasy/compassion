require('proof')(1, prove)

function prove (assert) {
    var Recorder = require('../recorder')
    assert(Recorder, 'require')
}
