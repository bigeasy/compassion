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
    program.helpIf(program.ultimate.help)
    program.required('conduit')
    // TODO Assert that these are integers.
    program.validate(require('arguable/numeric'), 'timeout', 'ping')

    var abend = require('abend')
    var coalesce = require('extant')

    var logger = require('prolific.logger').createLogger('compassion.colleague')

    var Shuttle = require('prolific.shuttle')

    var Envoy = require('assignation/envoy')

    var Middleware = require('./middleware')

    var Colleague = require('./colleague')
    var Chaperon = require('./chaperon')
    var Monitor = require('./monitor')
    var Destructor = require('destructible')
    var Terminator = require('destructible/terminator')
    var Vizsla = require('vizsla')
    var UserAgent = require('./ua')

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

    kibitzer.paxos.scheduler.events.pump(new Timer(kibitzer.paxos.scheduler), 'enqueue')

    kibitzer.played.pump(new Recorder('kibitz', logger), 'push')
    kibitzer.paxos.outbox.pump(new Recorder('paxos', logger), 'push')
    kibitzer.islander.outbox.pump(new Recorder('islander', logger), 'push')

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructible = new Destructor('colleague')

    destructible.events.pump(new Terminator(1000), 'push')
    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.addDestructor('shutdown', shuttle, 'close')
    destructible.addDestructor('kibitzer', kibitzer, 'destroy')

    var colleague = new Colleague(new Vizsla, kibitzer)

    var startedAt = Date.now()
    var middleware = new Middleware(startedAt, program.ultimate.island, kibitzer, colleague)

    var envoy = new Envoy(middleware.reactor.middleware)

    var location = program.ultimate.conduit
    location = url.resolve(location + '/', program.ultimate.island)
    location = url.resolve(location + '/',  program.ultimate.id)

    colleague.chatter.pump(new Recorder('colleague', logger), 'push')
    var monitor = new Monitor

    var chaperon = new Chaperon({
        ua: new Vizsla(),
        chaperon: program.ultimate.chaperon,
        kibitzer: kibitzer,
        colleague: colleague,
        island: program.ultimate.island,
        startedAt: startedAt
    })

    cadence(function (async) {
        destructible.stack(async, 'kibitzer')(function (ready) {
            kibitzer.listen(async())
            kibitzer.ready.wait(ready, 'unlatch')
        })

        destructible.stack(async, 'envoy')(function (ready) {
            destructible.addDestructor('envoy', envoy, 'close')
            envoy.connect(location, async())
            envoy.ready.wait(ready, 'unlatch')
        })

        destructible.stack(async, 'monitor')(function (ready) {
            destructible.addDestructor('monitor', monitor, 'destroy')
            async(function () {
                monitor.run(program, async())
            }, function (exitCode, signal) {
                logger.info('exited', { exitCode: exitCode, signal: signal })
            })
            monitor.ready.wait(ready, 'unlatch')
        })

        destructible.stack(async, 'colleague')(function (ready) {
            destructible.addDestructor('colleague', colleague.destroy.bind(colleague))
            colleague.listen(monitor.child.stdio[3], monitor.child.stdio[3], ready, async())
        })

        destructible.stack(async, 'chaperon')(function (ready) {
            destructible.addDestructor('chaperon', chaperon, 'destroy')
            chaperon.listen(async())
            ready.unlatch()
        })
    })(abend)

    async(function () {
        destructible.ready.wait(async())
    }, function () {
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
    })
}))
