/*

    ___ usage ___ en_US ___
    compassion colleague child <child options>

    options:

        -b, --bind <address:port>
            address and port to bind to

        -m, --module
            use a Node.js module instead of an executable for the child

        -I, --island <string>
            name of the island

        -i, --id <string>
            colleague id

        --ipc
            communicate with child using Node IPC instead of socket

        --help
            display help message

    ___ $ ___ en_US ___

        bind is required:
            the `--bind` argument is a required argument

        name is required:
            the `--name` argument is a required argument
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

//    Shuttle.shuttle(program, 1000, logger)

    program.helpIf(program.command.param.help)
    program.command.required('bind')

    var bind = program.command.bind('bind')

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
        ua: new UserAgent(new Vizsla)
    })
    program.on('SIGINT', colleague.stop.bind(colleague))
    colleague.listen(program.command.param.bind, abend)
}))
