require('proof')(5, require('cadence')(prove))

function prove (async, assert) {
    var replay = require('./replay')
    replay(assert, 'fourth', async())
}
