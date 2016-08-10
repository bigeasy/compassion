/*

    ___ usage ___ en_US ___
    compassion colleague child <child options>

    options:

        -c, --conduit <address:port>
            address of the conduit to use for network communication

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
    var Listener = require('./listener')

    var Colleague = require('./http.js')

    var logger = require('prolific.logger').createLogger('bigeasy.compassion.colleague.bin')

    Shuttle.shuttle(program, 1000, logger)

    program.helpIf(program.ultimate.help)
    program.required('conduit')

// TODO Assert that these are integers.
    program.validate(require('arguable/numeric'), 'timeout', 'ping')

    var argv = program.argv.slice()
    var delegate = program.attempt(function () {
        return require(argv[0])
    }, /^code:MODULE_NOT_FOUND$/, 'cannot find module')

    var UserAgent = require('./ua')
    var Vizsla = require('vizsla')

    var colleague = new Colleague({
        islandName: program.ultimate.island,
        colleagueId: program.ultimate.id,
        timeout: +(program.ultimate.timeout || 60000),
        ping: +(program.ultimate.ping || 10000),
// TODO Simplify.
        ua: new UserAgent(new Vizsla)
    })
    program.on('shutdown', colleague.shutdown.bind(colleague))
    async(function () {
        delegate([{ colleague: colleague }, argv], {}, async())
    }, function () {
        var listener = new Listener(colleague)
        listener.listen(program.ultimate.conduit, abend)
        program.on('shutdown', listener.stop.bind(listener))
        listener.listening.enter(async())
    })
}))
