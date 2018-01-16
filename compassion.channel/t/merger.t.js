require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Merger = require('../merger')
    var Procession = require('procession')
    var cadence = require('cadence')
    var merger = new Merger({
        paxos: {
            outbox: new Procession(),
            log: new Procession()
        },
        islander: { outbox: new Procession() }
    }, {
        chatter: new Procession(),
        getProperties: cadence(function () {
            throw new Error('conduit#endOfStream')
        })
    })
    async(function () {
        merger.merge(async())
    }, function () {
        okay(true, 'empty stream')
    })
}
