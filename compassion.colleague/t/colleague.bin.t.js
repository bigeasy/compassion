require('proof')(1, prove)

function prove (assert) {
    var UserAgent = require('../ua')
    assert(UserAgent, 'require')
}
