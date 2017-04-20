require('proof')(1, prove)

function prove (assert) {
    var Monitor = require('../monitor')
    assert(Monitor, 'require')
}
