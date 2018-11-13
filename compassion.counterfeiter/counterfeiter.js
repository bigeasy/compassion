var cadence = require('cadence')
var Procession = require('procession')

module.exports = function (Conference) {
    return cadence(function (async, destructible, colleague, application, registration) {
        var inbox = new Procession, outbox = new Procession
        destructible.destruct.wait(function () { console.log('ending!', registration.id) })
        destructible.destruct.wait(inbox, 'end')
        destructible.destruct.wait(function () {
            console.log('counterfeiter end!!!', inbox.conduit)
            inbox.end()
        })
        destructible.destruct.wait(outbox, 'end')
        destructible.destruct.wait(function () { console.log('ended!', registration.id) })
        async(function () {
            colleague.register(inbox, outbox, registration, async())
        }, function () {
            async(function () {
                destructible.monitor('conference', Conference, outbox, inbox, application, false, async())
            }, function (conference) {
                async(function () {
                    conference.ready(async())
                }, function () {
                    return [ conference, colleague ]
                })
            })
        })
    })
}
