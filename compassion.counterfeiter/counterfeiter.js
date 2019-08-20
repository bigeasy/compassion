const Avenue = require('avenue')

module.exports = function (Conference) {
    return function (destructible, colleague, application, registration) {
        const queues = {
            colleague: { inbox: new Avenue, outbox: new Avenue },
            conference: { inbox: new Avenue, outbox: new Avenue }
        }
        const up = queues.conference.outbox.shifter()
        destructible.durable('up', up.pump(entry => queues.colleague.inbox.push(entry)), () => up.destroy())
        const down = queues.colleague.outbox.shifter()
        destructible.durable('down', down.pump(entry => queues.colleague.inbox.push(entry)), () => down.destroy())
        colleague.connect(queues.colleague.inbox, queues.colleague.outbox)

        // confrenece.pump or something.
        /*
            async(function () {
                destructible.durable('conference', Conference, queues.conference.inbox, queues.conference.outbox, application, false, async())
            }, function (conference) {
                async(function () {
                    conference.ready(registration, async())
                }, function () {
                    return [ conference, colleague ]
                })
            })
        })
        */
    }
}
