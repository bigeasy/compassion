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

    var prolific = require('prolific')
    var Shuttle = require('prolific.shuttle')
    var abend = require('abend')

    var Colleague = require('./http.js')

    var logger = prolific.createLogger('bigeasy.compassion.colleague.bin')

    Shuttle.shuttle(program, 1000, logger)

    program.helpIf(program.command.param.help)
    program.command.required('bind')

    var bind = program.command.bind('bind')

    if (!program.command.param.module) {
        module = './child'
    } else {
        module = program.argv.shift()
    }

    try {
        var Delegate = require(module)
    } catch (e) {
        throw e
    }


    var UserAgent = require('./ua')
    var Vizsla = require('vizsla')
    console.log(program.command.param.bind)

    var colleague = new Colleague({
        islandName: program.command.param.island,
        colleagueId: program.command.param.id,
        Delegate: Delegate,
        ua: new UserAgent(new Vizsla)
    })
    program.on('SIGINT', colleague.stop.bind(colleague))
    colleague.listen(program.command.param.bind, abend)
}))
