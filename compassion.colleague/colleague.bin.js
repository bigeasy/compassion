/*

    ___ usage ___ en_US ___
    compassion colleague child <child options>

    options:

        -m, --mingle <url>
            discovery url

        -s, --stable <milliseconds>
            seconds to wait for stability to determine bootstrapping TODO fix desc

        -c, --conduit <address:port>
            address of the conduit to use for network communication

        -I, --island <string>
            name of the island

        -i, --id <string>
            colleague id

        -T, --http-timeout <integer>
            milliseconds to wait on an HTTP network request (default 1000)

        -p, --ping <integer>
            milliseconds between keep alive pings (defualt 1000)

        -t, --timeout <integer>
            milliseconds before a participant is considered unreachable (defualt 5000)

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
    program.helpIf(program.ultimate.help)
    program.required('conduit')
    // TODO Assert that these are integers.
    program.validate(require('arguable/numeric'), 'timeout', 'ping')

    var logger = require('prolific.logger').createLogger('compassion.colleague')
    var Recorder = require('./recorder')

    var Shuttle = require('prolific.shuttle')

    var Colleague = require('./colleague')
    var Monitor = require('./monitor')
    var Destructible = require('destructible')
    var Vizsla = require('vizsla')
    var Interlocutor = require('interlocutor')
    var UserAgent = require('./ua')
    var Conduit = require('conduit')
    var Procedure = require('conduit/procedure')
    var Caller = require('conduit/caller')
    var Client = require('conduit/client')
    var Multiplexer = require('conduit/multiplexer')
    var Signal = require('signal')

    var shuttle = Shuttle.shuttle(program, logger)

    var coalesce = require('extant')
    var Extracted = require('./extracted')

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructible = new Destructible(1000, 'colleague')

    var Monitor = require('./monitor')
    var Conduit = require('conduit')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Descendent = require('descendent')
    var descendent = new Descendent(program)

    destructible.destruct.wait(shuttle, 'close')
    destructible.destruct.wait(descendent, 'decrement')

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function  () {
        destructible.monitor('colleague', Extracted, {
            id: program.ultimate.id,
            island: program.ultimate.island,
            conduit: program.ultimate.conduit,
            ping: coalesce(program.ultimate.ping, 1000),
            timeout: coalesce(program.ultimate.timeout, 5000),
            httpTimeout: +coalesce(program.ultimate['http-timeout'], 1000),
            recorder: function (name) { return new Recorder(name, logger) }
        }, async())
    }, function (multiplexer) {
        async(function () {
            destructible.monitor('monitor', Monitor, program, descendent, async())
        }, function (child) {
            destructible.monitor('conduit', Conduit, child.stdio[3], child.stdio[3], multiplexer, async())
        })
    }, function () {
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
