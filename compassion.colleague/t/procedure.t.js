require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Procedure = require('../resolver/procedure')
    async(function () {
        new Procedure({
            invoke: function (envelope, callback) {
                callback(null, [])
            }
        }).resolve(async())
    }, function (resolved) {
        okay(resolved, [], 'resolved')
    })
}
