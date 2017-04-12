require('proof')(1, prove)

function prove (assert) {
    var Counterfeiter = require('..')
    assert(Counterfeiter, 'require')
}
