require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var Channel = require('../channel')
    assert(Channel, 'required')
}
