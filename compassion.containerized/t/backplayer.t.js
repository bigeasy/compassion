require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var backplayer = require('../backplayer')
    okay(backplayer, 'require')
}
