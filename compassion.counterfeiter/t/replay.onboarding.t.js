require('proof')(4, require('cadence')(prove))

function prove (async, assert) {
    var replay = require('./replay')
    replay(assert, 'fourth', async())
}
