/*

    ___ usage ___ en_US ___
    compassion colleague child <child options>

    options:

        -c, --conduit <address:port>
            address of the conduit to use for network communication

        -m, --module
            use a Node.js module instead of an executable for the child

        -I, --island <string>
            name of the island

        -i, --id <string>
            colleague id

        -p, --ping <integer>
            milliseconds between keep alive pings (defualt 250)

        -t, --timeout <integer>
            milliseconds before a participant is considered unreachable
                (defualt 1000)

        -r, --replay <string>
            replay a log

        --ipc
            communicate with child using Node IPC instead of socket

        --help
            display help message

    ___ $ ___ en_US ___

        conduit is required:
            the `--conduit` argument is a required argument
    ___ . ___

 */
require('arguable')(module, require('cadence')(function (async, program) {
    var http = require('http')

    var children = require('child_process')
    var Shuttle = require('prolific.shuttle')
    var abend = require('abend')
    var Delta = require('delta')

    var Colleague = require('./http.js')

    var logger = require('prolific.logger').createLogger('bigeasy.compassion.colleague.bin')

    Shuttle.shuttle(program, 1000, logger)

    program.helpIf(program.command.param.help)
    program.command.required('conduit')

    var stdio = [ 'inherit', 'inherit', 'inherit' ]
    var exec = true
    if (program.command.param.ipc) {
        module = './ipc'
        stdio.push('ipc')
    } else if (program.command.param.module) {
        module = program.argv.shift()
        exec = false
    } else {
        module = './child'
        stdio.push('pipe')
    }

    try {
        var Delegate = require(module)
    } catch (e) {
        throw e
    }

    var UserAgent = require('./ua')
    var Vizsla = require('vizsla')
    if (exec) {
        var child = children.spawn(program.argv.shift(), program.argv, { stdio: stdio })
        async(function () {
            new Delta(async()).ee(child).on('close')
        }, function (exit, signal) {
            console.log(exit, signal)
            colleague.stop()
// TODO Want.
            // return program.exitCode(exit, signal)
            return exit
        })
    }

    var colleague = new Colleague({
        islandName: program.command.param.island,
        colleagueId: program.command.param.id,
        Delegate: Delegate,
        argv: child,
// TODO Assert that these are integers.
        timeout: +(program.command.param.timeout || 60000),
        ping: +(program.command.param.ping || 10000),
        ua: new UserAgent(new Vizsla)
    })
    program.on('SIGINT', colleague.stop.bind(colleague))
    var fs = require('fs')
    var byline = require('byline')
    var player = colleague
    if (program.command.param.replay) {
        colleague.replay()
        async(function () {
            colleague.delegate.initialize(program, async())
        }, function () {
            var stream = fs.createReadStream(program.command.param.replay)
            byline(stream).on('data', function (line) {
                if (/^{/.test(line.toString())) {
                    colleague.play(JSON.parse(line.toString()))
                }
            })
            stream.on('end', function () { program.emit('SIGINT') })
        })
    } else {
        colleague.listen(program.command.param.conduit, program, abend)
    }
}))
