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

    var logger = require('prolific.logger').createLogger('compassion.colleague')

    var Shuttle = require('prolific.shuttle')

    var Envoy = require('nascent.rendezvous/envoy')

    var Middleware = require('./middleware')

    var Colleague = require('./colleague')
    var Monitor = require('./monitor')
    var Destructor = require('destructible')

    var Kibitzer = require('kibitz')

    var shuttle = Shuttle.shuttle(program, logger)

    var url = require('url')

    var kibitzer = new Kibitzer({ id: program.ultimate.id })

    var cadence = require('cadence')


    logger.info('started', { parameters: program.utlimate, argv: program.argv })

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructor = new Destructor
    program.on('shutdown', destructor.destroy.bind(destructor))
    destructor.addDestructor('shutdown', shuttle.close.bind(shuttle))

    var middleware = new Middleware(Date.now(), program.ultimate.island, kibitzer)

    var envoy = new Envoy(middleware.dispatcher.createWrappedDispatcher())


    var location = program.ultimate.conduit
    location = url.resolve(location + '/', program.ultimate.island)
    location = url.resolve(location + '/',  program.ultimate.id)

    var colleague = new Colleague
    var monitor = new Monitor

    destructor.destructable(function (callback) {
        destructor.addDestructor('envoy', envoy.close.bind(envoy))
        envoy.connect(location, callback)
    }, async())

    destructor.destructable(cadence(function (async) {
        async(function () {
            envoy.connected.wait(async())
        }, function () {
            console.log('here')
            destructor.destructable(cadence(function (async) {
                destructor.destructable(cadence(function (async) {
                    destructor.addDestructor('monitor', monitor.destroy.bind(monitor))
                    async(function () {
                        monitor.run(program, async())
                    }, function (exitCode, signal) {
                        logger.info('exited', { exitCode: exitCode, signal: signal })
                    })
                }), async())
                async(function () {
                    monitor.started.wait(async())
                }, function () {
                    destructor.destructable(function (callback) {
                        console.log('colleague listening')
                        destructor.addDestructor('colleague', colleague.destroy.bind(colleague))
                        colleague.listen(monitor.child.stdio[3], monitor.child.stdio[3], callback)
                    }, async())
                })
            }), async())
        })
    }), async())
}))
