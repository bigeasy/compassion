var cadence = require('cadence')
var Procession = require('procession')

module.exports = function (Conference) {
    return cadence(function (async, destructible, colleague, application, registration) {
        var queues = {
            colleague: { inbox: new Procession, outbox: new Procession },
            conference: { inbox: new Procession, outbox: new Procession }
        }
        destructible.monitor('up', queues.conference.outbox.pump(queues.colleague.inbox, 'push'), 'destructible', null)
        destructible.monitor('down', queues.colleague.outbox.pump(queues.conference.inbox, 'push'), 'destructible', null)
        async(function () {
            colleague.connect(queues.colleague.inbox, queues.colleague.outbox, async())
        }, function () {
            async(function () {
                destructible.monitor('conference', Conference, queues.conference.inbox, queues.conference.outbox, application, false, async())
            }, function (conference) {
                async(function () {
                    conference.ready(registration, async())
                }, function () {
                    return [ conference, colleague ]
                })
            })
        })
    })
}
