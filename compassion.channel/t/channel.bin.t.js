require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('..'), program

    var Destructible = require('destructible')
    var destructible = new Destructible('t/mock')

    var UserAgent = require('vizsla')
    var ua = new UserAgent

    async([function  () {
        destructible.completed.wait(async())
    }, function (error) {
        console.log(error.stack)
        throw error
    }])
    async([function () {
        destructible.destroy()
    }], function () {
        program = bin([ '--local', 8386, '--id', 'third' ], {}, async())
        async(function () {
            program.ready.wait(async())
        }, function () {
            ua.fetch({
                url:  'http://127.0.0.1:8386/',
                raise: true,
                parse: 'text'
            }, async())
        }, function (body) {
            okay(body, 'Compassion Replay API\n', 'index')
            program.stdin.end('\n')
            program.emit('SIGTERM')
        })
    })
}
