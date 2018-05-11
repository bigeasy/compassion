require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var assert = require('assert')
    var backplayer = require('../backplayer')
    function advance (entries) {
        return function (type, callback) {
            var entry = entries.shift()
            assert(entry.type == type)
            callback(null, entry)
        }
    }
    async(function () {
        backplayer(advance([{
            type: 'backlog',
            id: 'first',
            body: 'application/json'
        }, {
            type: 'body',
            id: 'first',
            body: { a: 1 }
        }]), async())
    }, function (body) {
        okay(body, { a: 1 }, 'json')
    })
}
