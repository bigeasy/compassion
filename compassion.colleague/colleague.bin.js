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
    var coalesce = require('nascent.coalesce')

    var logger = require('prolific.logger').createLogger('compassion.colleague')

    var Shuttle = require('prolific.shuttle')

    var Envoy = require('nascent.rendezvous/envoy')

    var Middleware = require('./middleware')

    var Colleague = require('./colleague')
    var Chaperon = require('./chaperon')
    var Monitor = require('./monitor')
    var Destructor = require('destructible')
    var Terminator = require('destructible/terminator')
    var UserAgent = require('vizsla')

    var Kibitzer = require('kibitz')
    var Recorder = require('./recorder')

    var shuttle = Shuttle.shuttle(program, logger)

    var url = require('url')

    var kibitzer = new Kibitzer({
        id: program.ultimate.id,
        ping: coalesce(program.ultimate.ping, 1000),
        timeout: coalesce(program.ultimate.timeout, 5000)
    })

    var Timer = require('happenstance').Timer

    var cadence = require('cadence')

    kibitzer.paxos.scheduler.events.pump(new Timer(kibitzer.paxos.scheduler))

    kibitzer.played.pump(new Recorder('kibitz', logger))

    logger.info('started', { parameters: program.utlimate, argv: program.argv })

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructor = new Destructor('colleague')
    destructor.events.pump(new Terminator(1000))
    program.on('shutdown', destructor.destroy.bind(destructor))
    destructor.addDestructor('shutdown', shuttle.close.bind(shuttle))
    destructor.addDestructor('kibitzer', kibitzer.shutdown.bind(kibitzer, abend))

    var startedAt = Date.now()
    var middleware = new Middleware(startedAt, program.ultimate.island, kibitzer)

    var envoy = new Envoy(middleware.dispatcher.createWrappedDispatcher())

    var location = program.ultimate.conduit
    location = url.resolve(location + '/', program.ultimate.island)
    location = url.resolve(location + '/',  program.ultimate.id)

    var colleague = new Colleague
    var monitor = new Monitor

    var chaperon = new Chaperon({
        ua: new UserAgent(),
        chaperon: program.ultimate.chaperon,
        kibitzer: kibitzer,
        colleague: colleague,
        island: program.ultimate.island,
        startedAt: startedAt
    })

    destructor.async(async, 'envoy')(function () {
        destructor.addDestructor('envoy', envoy.close.bind(envoy))
        envoy.connect(location, async())
    })

    destructor.async(async, 'main')(function () {
        envoy.connected.wait(async())
    }, function () {
        destructor.async(async, 'connected')(function () {
            destructor.async(async, 'monitor')(function () {
                destructor.addDestructor('monitor', monitor.destroy.bind(monitor))
                async(function () {
                    monitor.run(program, async())
                }, function (exitCode, signal) {
                    logger.info('exited', { exitCode: exitCode, signal: signal })
                })
            })
            async(function () {
                monitor.started.wait(async())
            }, function () {
                destructor.async(async, 'colleague')(function () {
                    destructor.addDestructor('colleague', colleague.destroy.bind(colleague))
                    colleague.listen(monitor.child.stdio[3], monitor.child.stdio[3], async())
                })
                async(function () {
                    colleague.connected.wait(async())
                }, function () {
                   destructor.async(async, 'chaperon')(function () {
                        destructor.addDestructor('chaperon', chaperon.destroy.bind(chaperon))
                        chaperon.listen(async())
                    })
                })
            })
        })
    })
}))
