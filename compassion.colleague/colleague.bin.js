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
    var Interlocutor = require('interlocutor')
    var UserAgent = require('./ua')
    var Conduit = require('conduit')
    var Signal = require('signal')

    var Kibitzer = require('kibitz')
    var Recorder = require('./recorder')

    var shuttle = Shuttle.shuttle(program, logger)

    var url = require('url')

    var kibitzer = new Kibitzer({
        id: program.ultimate.id,
        ping: coalesce(program.ultimate.ping, 1000),
        timeout: coalesce(program.ultimate.timeout, 5000)
    })

    var cadence = require('cadence')

    kibitzer.played.shifter().pump(new Recorder('kibitz', logger), 'push')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger), 'push')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger), 'push')

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructible = new Destructible(1000, 'colleague')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Descendent = require('descendent')
    var descendent = new Descendent(program)
    destructible.addDestructor('descendent', descendent, 'decrement')

    destructible.addDestructor('shutdown', shuttle, 'close')

    var startedAt = Date.now()

    var monitor = new Monitor

    var Chaperon = {
        Middleware: require('chaperon/chaperon'),
        Client: require('./chaperon'),
        Colleagues: require('chaperon/colleagues')
    }

    var colleagues = new Chaperon.Colleagues({
        ua: new Vizsla,
        mingle: coalesce(program.ultimate.mingle, [ program.ultimate.conduit ])
    })

    var middleware = new Chaperon.Middleware({
        colleagues: colleagues,
        stableAfter: +(coalesce(program.ultimate.stable, 30) * 1000)
    })

    var colleague = new Colleague(new Vizsla, kibitzer, program.ultimate.island, program.ultimate['http-timeout'])
    colleague.chatter.shifter().pump(new Recorder('colleague', logger), 'push')

    var chaperon = new Chaperon.Client({
        ua: new Vizsla().bind({
            http: new Interlocutor(middleware.reactor.middleware)
        }),
        chaperon: program.ultimate.chaperon,
        kibitzer: kibitzer,
        colleague: colleague,
        island: program.ultimate.island,
        startedAt: startedAt
    })

    // Ugly.
    colleague._middleware._chaperon = chaperon

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function  () {
        destructible.addDestructor('monitor', monitor, 'destroy')
        monitor.run(program, descendent, destructible.monitor('monitor'))
        Signal.first(monitor.ready, destructible.completed, async())
    }, function () {
        // Gives an `ENOENT` time to report and cancel the series. Still
        // necessary?
        setImmediate(async())
    }, function () {
        var parsed = url.parse(program.ultimate.conduit)
        destructible.addDestructor('colleague', colleague, 'destroy')
        colleague.listen(parsed.hostname, parsed.port, destructible.monitor('colleague'))
        Signal.first(colleague.ready, destructible.completed, async())
    }, function () {
        var conduit = new Conduit(monitor.child.stdio[3], monitor.child.stdio[3], colleague)
        destructible.addDestructor('conduit', conduit, 'destroy')
        conduit.listen(null, destructible.monitor('conduit'))
        Signal.first(conduit.ready, destructible.completed, async())
    }, function () {
        destructible.addDestructor('chaperon', chaperon, 'destroy')
        // TODO WHy won't Chaperon die correctly?
        chaperon.listen(destructible.rescue('chaperon'))
    }, function () {
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
