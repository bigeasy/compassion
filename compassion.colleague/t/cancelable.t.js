require('proof')(3, require('cadence')(prove))

function prove (async, assert) {
    var Cancelable = require('../cancelable')
    var conference = {
        _send: function (cancelable, method, colleagueId, value, callback) {
            callback(null, 'send')
        },
        _broadcast: function (cancelable, method, value, callback) {
            callback(null, 'broadcast')
        },
        _reduce: function (cancelable, method, value, callback) {
            callback(null, 'reduce')
        }
    }
    var cancelable = new Cancelable(conference)
    async(function () {
        cancelable.send('method', 'x', {}, async())
    }, function (value) {
        assert(value, 'send', 'send')
        cancelable.broadcast('method', {}, async())
    }, function (value) {
        assert(value, 'broadcast', 'broadcast')
        cancelable.reduce('method', {}, async())
    }, function (value) {
        assert(value, 'reduce', 'reduce')
    })
}
