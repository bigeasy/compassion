require('proof')(2, prove)

function prove (okay, callback) {
    var Conference = require('../../compassion.conference/conference')

    var fs = require('fs')
    var path = require('path')

    var Procession = require('procession')

    var Staccato = require('staccato')

    var Replay = require('../replay')
    var Application = require('../../compassion.colleague/test/application')

    var Destructible = require('destructible')
    var destructible = new Destructible('test/replay.t.js')

    var byline = require('byline')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            var queues = {
                colleague: { inbox: new Procession, outbox: new Procession },
                conference: { inbox: new Procession, outbox: new Procession }
            }
            destructible.durable('up', queues.conference.outbox.pump(queues.colleague.inbox, 'push'), 'destructible', null)
            destructible.durable('down', queues.colleague.outbox.pump(queues.conference.inbox, 'push'), 'destructible', null)
            var input = fs.createReadStream(path.join(__dirname, '..', '..', 'compassion.colleague', 'test', 'entries.jsons'))
            async(function () {
                var application = new Application('second', null)
                var readable = new Staccato.Readable(byline(input))
                destructible.durable('replay', Replay, {
                    inbox: queues.colleague.inbox,
                    outbox: queues.colleague.outbox,
                    readable: readable,
                    island: 'island',
                    id: 'second'
                }, async())
                destructible.durable('conference', Conference, queues.conference.inbox, queues.conference.outbox, application, true, async())
            }, function (replayer, conference) {
                conference.ready(async())
            }, function () {
                setTimeout(async(), 250)
            }, function () {
                okay('second')
            })
        }, function () {
            var inbox = new Procession, outbox = new Procession
            var input = fs.createReadStream(path.join(__dirname, '..', '..', 'compassion.colleague', 'test', 'entries.jsons'))
            async(function () {
                var application = new Application('first', null)
                var readable = new Staccato.Readable(byline(input))
                destructible.destruct.wait(inbox, 'end')
                destructible.destruct.wait(outbox, 'end')
                destructible.durable('replay', Replay, {
                    inbox: inbox,
                    outbox: outbox,
                    readable: readable,
                    island: 'island',
                    ping: 150,
                    timeout:  450,
                    id: 'first'
                }, async())
                destructible.durable('conference', Conference, outbox, inbox, application, true, async())
            }, function (replayer, conference) {
                conference.ready(async())
            }, function () {
                setTimeout(async(), 250)
            }, function () {
                okay('first')
            })
        })
    })(destructible.durable('test'))
}
