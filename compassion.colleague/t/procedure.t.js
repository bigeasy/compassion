require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Procession = require('procession')
    var Procedure = require('../resolver/procedure')
    async(function () {
        new Procedure({
            connect: function (envelope, callback) {
                var inbox = new Procession
                var shifter = inbox.shifter()
                inbox.push([])
                return { inbox: shifter }
            }
        }).resolve(async())
    }, function (resolved) {
        okay(resolved, [], 'resolved')
    })
}
