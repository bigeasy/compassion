var children = require('child_process')
var delta = require('delta')
var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('compassion.colleague')
var coalesce = require('extant')

var Signal = require('signal')
var Destructible = require('destructible')

var noop = require('nop')

var exit = cadence(function (async, child, destruct) {
    var cookie = destruct.wait(child, 'kill')
    async([function () {
        destruct.cancel(cookie)
    }], function () {
        delta(async()).ee(child).on('exit')
    }, function (exitCode, signal) {
        interrupt.assert(exitCode == 0 || signal == 'SIGTERM', 'childExit', {
            exitCode: coalesce(exitCode),
            signal: coalesce(signal)
        })
    })
})

module.exports = cadence(function (async, destructible, program, descendent) {
    var cookie
    descendent.increment()
    destructible.destruct.wait(descendent, 'decrement')
    async(function () {
        var env = JSON.parse(JSON.stringify(program.env))
        env.COMPASSION_COLLEAGUE_FD = 3
        var argv = program.argv.slice()
        var command = argv.shift()

        var child = children.spawn(command, argv, {
            stdio: [ 0, 1, 2, 'pipe', 'ipc' ],
            env: env
        })

        async(function () {
            // At shutdown, there may be no one listening to the pipe. The Conduit
            // might get shut down so that it does not have an error handler
            // registered. If there is an error on the pipe and no one is listening
            // it means we're shutting down, so we don't really care about this
            // error.
            child.stdio[3].once('error', noop)

            descendent.addChild(child, null)

            // Wait for an exit.
            exit(child, destructible.destruct, destructible.monitor('child'))

            // Give it 30ms to start up, which gives it a chance to ENOENT.
            async(function () {
                setTimeout(async(), 30)
            }, function () {
                return [ child ]
            })
        }, function (exitCode, signal) {
        })
    })
})
