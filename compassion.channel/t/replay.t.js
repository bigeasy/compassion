require('proof')(1, prove)

function prove (okay, callback) {
    var Conference = require('../../compassion.conference/conference')

    var fs = require('fs')
    var path = require('path')

    var Procession = require('procession')

    var Staccato = require('staccato')

    var Replay = require('../replay')
    var Application = require('../../compassion.colleague/t/application')

    var Destructible = require('destructible')
    var destructible = new Destructible('t/replay.t.js')

    var byline = require('byline')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    cadence(function (async) {
        var inbox = new Procession, outbox = new Procession
        var input = fs.createReadStream(path.join(__dirname, '..', '..', 'compassion.colleague', 't', 'entries.jsons'))
        async(function () {
            var application = new Application('second', null)
            var readable = new Staccato.Readable(byline(input))
            destructible.destruct.wait(inbox, 'end')
            destructible.destruct.wait(outbox, 'end')
            destructible.monitor('replay', Replay, {
                inbox: inbox,
                outbox: outbox,
                readable: readable,
                island: 'island',
                id: 'second'
            }, async())
            destructible.monitor('conference', Conference, outbox, inbox, application, true, async())
        }, function (replayer, conference) {
            conference.ready(async())
        }, function () {
            setTimeout(async(), 250)
        }, function () {
            okay(true, 'ran')
        })
    })(destructible.monitor('test'))
}
