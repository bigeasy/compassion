/*

    ___ usage ___ en_US ___
    compassion colleague child <child options>

    options:

        -C, --chaperon <address:port>
            address of the chaperon that has bootstrap status

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
        unknown argument:
            Unknown argument %s.
    ___ . ___

 */
require('arguable')(module, require('cadence')(function (async, program) {
    var http = require('http')

    var children = require('child_process')
    var Shuttle = require('prolific.shuttle')
    var abend = require('abend')
    var Listener = require('./listener')

    var Colleague = require('./http.js')

    var logger = require('prolific.logger').createLogger('compassion.colleague')

    var shuttle = Shuttle.shuttle(program, logger)

    program.helpIf(program.ultimate.help)
    program.required('conduit')

// TODO Assert that these are integers.
    program.validate(require('arguable/numeric'), 'timeout', 'ping')

    var argv = program.argv.slice()
    var delegate = program.attempt(function () {
        return require(argv.shift())
    }, /^code:MODULE_NOT_FOUND$/, 'cannot find module')

    var UserAgent = require('./ua')
    var Vizsla = require('vizsla')

    var colleague = new Colleague({
        islandName: program.ultimate.island,
        colleagueId: program.ultimate.id,
        timeout: +(program.ultimate.timeout || 60000),
        ping: +(program.ultimate.ping || 10000),
        chaperon: 'http://' + program.ultimate.chaperon,
        conduit: program.ultimate.conduit,
// TODO Simplify.
        ua: new UserAgent(new Vizsla)
    })
    program.on('shutdown', colleague.shutdown.bind(colleague))
    program.on('shutdown', shuttle.close.bind(shuttle))
    async(function () {
        delegate(argv, program, async())
    }, function (constructor) {
    // TODO Okay, obviously then, if you really want to break things up, instead
    // of colleague, you just have a publisher, or the colleague exposes only a
    // publish interface, and that gets plugged in later, or you send an event
    // emitter, or something, because publish is synchronous, fire and forget.
    //
    // Ah, so you return an event emitter, or pass one in? Meh. Let's hide the
    // colleague itself from a Conference user. We can assign details to the
    // Conference object.
        constructor(colleague, false, async())
    }, function (consumer, properties) {
        colleague._setConsumer(consumer, properties)
        var listener = new Listener(colleague, consumer)
        listener.listen(program.ultimate.conduit, abend)
        program.on('shutdown', listener.stop.bind(listener))
        listener.listening.enter(async())
        colleague.chaperon.check()
        logger.info('started', { parameters: program.ultimate, argv: program.argv })
    })
}))
