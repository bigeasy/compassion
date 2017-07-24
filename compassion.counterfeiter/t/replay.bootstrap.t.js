require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var replay = require('./replay')
    replay(assert, 'first', async())
}
