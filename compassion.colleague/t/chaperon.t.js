require('proof')(1, prove)

function prove (assert) {
    var Chaperon = require('../chaperon')
    assert(Chaperon, 'require')
}
