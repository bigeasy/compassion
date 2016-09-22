#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    compassion channel <child options>

    options:

        -l, --log <filename|->
            file to read

        -I, --island <string>
            name of the island

        -i, --id <string>
            colleague id

        -p, --ping <integer>
            milliseconds between keep alive pings (defualt 250)

        -t, --timeout <integer>
            milliseconds before a participant is considered unreachable (defualt 1000)

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
    var Shuttle = require('prolific.shuttle')
    var replay = require('./replay.js')
    var fs = require('fs')
    var Colleague = require('compassion.colleague/http')

    var logger = require('prolific.logger').createLogger('compassion.channel')

    var shuttle = Shuttle.shuttle(program, logger)

    program.helpIf(program.ultimate.help)

    program.assert(program.argv.length != 0, 'colleague module required')

    var stream = program.ultimate.log == null
               ? program.stdin
               : fs.createReadStream(program.ultimate.log)

    var argv = program.argv.slice()
    var delegate = program.attempt(function () {
        return require(argv.shift())
    }, /^code:MODULE_NOT_FOUND$/, 'cannot find module')

    var colleague = new Colleague({
        islandName: program.ultimate.island,
        colleagueId: program.ultimate.id,
        timeout: +(program.ultimate.timeout || 60000),
        ping: +(program.ultimate.ping || 10000),
        ua: null
    })

    program.on('shutdown', shuttle.close.bind(shuttle))

    async(function () {
        delegate(argv, async())
    }, function (constructor) {
        constructor(colleague, true, async())
    }, function (machine) {
        replay(stream, colleague, machine, async())
    })
}))
