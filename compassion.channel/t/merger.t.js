require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Merger = require('../merger')
    okay(Merger, 'require')
}
