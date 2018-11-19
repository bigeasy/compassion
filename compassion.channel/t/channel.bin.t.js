require('proof')(1, prove)

function prove (okay, callback) {
    var bin = require('..'), program

    var Destructible = require('destructible')
    var destructible = new Destructible('t/channel.bin')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    program = bin([ '--id', 'third' ], {}, destructible.monitor('run'))

    cadence(function (async) {
        async(function () {
            program.ready.wait(async())
        }, function () {
            program.stdin.end('\n')
            program.emit('SIGTERM')
        }, function () {
            okay(true, 'ran')
        })
    })(destructible.monitor('test'))
}
