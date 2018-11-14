module.exports = function (Conference) {
    var cadence = require('cadence')
    return cadence(function (async, destructible, olio, application, island, id, properties) {
        async(function () {
            olio.sender('compassion', cadence(function (async, destructible, inbox, outbox) {
                destructible.monitor('conference', Conference, inbox, outbox, application, false, async())
            }), async())
        }, function (sender) {
            console.log('sender!!!')
            async(function () {
                sender.processes[0].conduit.ready({
                    island: island,
                    id: id,
                    properties: properties
                }, async())
            }, function () {
                return sender.processes[0].conduit
            })
        })
    })
}
