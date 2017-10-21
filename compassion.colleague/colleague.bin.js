

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
    program.helpIf(program.ultimate.help)
    program.required('conduit')
    // TODO Assert that these are integers.
    program.validate(require('arguable/numeric'), 'timeout', 'ping')

    var http = require('http')
    var delta = require('delta')

    var coalesce = require('extant')

    var logger = require('prolific.logger').createLogger('compassion.colleague')

    var Shuttle = require('prolific.shuttle')

    var Colleague = require('./colleague')
    var Chaperon = require('./chaperon')
    var Monitor = require('./monitor')
    var Destructible = require('destructible')
    var Vizsla = require('vizsla')
    var UserAgent = require('./ua')
    var Conduit = require('conduit')

    var Kibitzer = require('kibitz')
    var Recorder = require('./recorder')
    var Responder = require('conduit/responder')

    var shuttle = Shuttle.shuttle(program, logger)

    var url = require('url')

    var kibitzer = new Kibitzer({
        id: program.ultimate.id,
        ping: coalesce(program.ultimate.ping, 1000),
        timeout: coalesce(program.ultimate.timeout, 5000)
    })

    var responder = new Responder(new UserAgent(new Vizsla), 'kibitz', kibitzer.write, kibitzer.read)

    var Timer = require('happenstance').Timer

    var cadence = require('cadence')

    kibitzer.played.shifter().pump(new Recorder('kibitz', logger), 'push')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger), 'push')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger), 'push')

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructible = new Destructible(1000, 'colleague')

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.addDestructor('shutdown', shuttle, 'close')

    var colleague = new Colleague(new Vizsla, kibitzer, program.ultimate.island, startedAt)

    var startedAt = Date.now()

    colleague.chatter.shifter().pump(new Recorder('colleague', logger), 'push')
    var monitor = new Monitor

    var chaperon = new Chaperon({
        ua: new Vizsla(),
        chaperon: program.ultimate.chaperon,
        kibitzer: kibitzer,
        colleague: colleague,
        island: program.ultimate.island,
        startedAt: startedAt
    })

    destructible.completed.wait(async())

    var finalist = require('finalist')

    async([function () {
        destructible.destroy()
    }], function  () {
        destructible.addDestructor('kibitzer', kibitzer, 'destroy')
        kibitzer.listen(destructible.monitor('kibitzer'))
        finalist(function (callback) {
            kibitzer.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        destructible.addDestructor('monitor', monitor, 'destroy')
        async(function () {
            monitor.run(program, destructible.monitor('monitor'))
        }, function (exitCode, signal) {
            logger.info('exited', { exitCode: exitCode, signal: signal })
        })
        finalist(function (callback) {
            monitor.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        // Gives an `ENOENT` time to report and cancel the series. Still
        // necessary?
        setImmediate(async())
    }, function () {
        var parsed = url.parse(program.ultimate.conduit)
        destructible.addDestructor('colleague', colleague, 'destroy')
        colleague.listen(parsed.hostname, parsed.port, destructible.monitor('colleague'))
        finalist(function (callback) {
            colleague.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        var conduit = new Conduit(monitor.child.stdio[3], monitor.child.stdio[3], colleague)
        destructible.addDestructor('conduit', conduit, 'destroy')
        conduit.listen(null, destructible.monitor('conduit'))
        finalist(function (callback) {
            conduit.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        destructible.addDestructor('chaperon', chaperon, 'destroy')
        // TODO WHy won't Chaperon die correctly?
        chaperon.listen(destructible.monitor('chaperon'))
    }, function () {
        console.log('started')
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
