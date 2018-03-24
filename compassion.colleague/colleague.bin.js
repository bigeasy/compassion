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

    var Envoy = require('assignation/envoy')

    var Pump = require('procession/pump')

    var Kibitzer = require('kibitz')
    var Recorder = require('./recorder')

    var shuttle = Shuttle.shuttle(program, logger)

    var url = require('url')

    var cadence = require('cadence')

    // program.on('shutdown', colleague.shutdown.bind(colleague))
    var destructible = new Destructible(1000, 'colleague')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Descendent = require('descendent')
    var descendent = new Descendent(program)

    destructible.destruct.wait(shuttle, 'close')
    destructible.destruct.wait(descendent, 'decrement')

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function  () {
        async(function () {
            destructible.monitor('caller', Caller, async())
            destructible.monitor('client', Client, async())
        }, function (caller, client) {
            async(function () {
                var timeout = +coalesce(program.ultimate['http-timeout'], 1000)
                destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, timeout), 'request', async())
            }, function (procedure) {
                caller.read.shifter().pumpify(procedure.write)
                procedure.read.shifter().pumpify(caller.write)
                destructible.monitor('kibitzer', Kibitzer, {
                    caller: caller,
                    id: program.ultimate.id,
                    ping: coalesce(program.ultimate.ping, 1000),
                    timeout: coalesce(program.ultimate.timeout, 5000)
                }, async())
            }, function (kibitzer) {
                // TODO This is really a mess.
                new Pump(kibitzer.played.shifter(), new Recorder('kibitz', logger), 'push').pumpify(destructible.monitor('kibitz.logger'))
                destructible.destruct.wait(function () { kibitzer.played.push(null) })
                new Pump(kibitzer.paxos.outbox.shifter(), new Recorder('paxos', logger), 'push').pumpify(destructible.monitor('paxos.logger'))
                destructible.destruct.wait(function () { kibitzer.paxos.outbox.push(null) })
                new Pump(kibitzer.islander.outbox.shifter(), new Recorder('islander', logger), 'push').pumpify(destructible.monitor('islander.logger'))
                destructible.destruct.wait(function () { kibitzer.islander.outbox.push(null) })
                var colleague = new Colleague(client, caller, kibitzer, program.ultimate.island)
                new Pump(colleague.chatter.shifter(), new Recorder('colleague', logger), 'push').pumpify(destructible.monitor('colleague.logger'))
                destructible.destruct.wait(function () { colleague.chatter.push(null) })
                async(function () {
                    destructible.monitor('multiplexer', Multiplexer, {
                        conference: caller,
                        incoming: client
                    }, async())
                }, function (multiplexer) {
                    destructible.destruct.wait(function () {
                        multiplexer.write.push(null)
                    })
                    async(function () {
                        destructible.monitor('monitor', Monitor, program, descendent, async())
                    }, function (child) {
                        destructible.monitor('conduit', Conduit, child.stdio[3], child.stdio[3], multiplexer, async())
                    })
                }, function () {
                    var parsed = url.parse(program.ultimate.conduit)
                    var request = http.request({
                        host: parsed.hostname,
                        port: parsed.port,
                        headers: Envoy.headers('/' + program.ultimate.id, { host: parsed.hostname + ':' + parsed.port })
                    })
                    delta(async()).ee(request).on('upgrade')
                    request.end()
                }, function (request, socket, header) {
                    destructible.monitor([ 'envoy', 1 ], Envoy, colleague.middleware, socket, header, async())
                })
            })
        })
    }, function () {
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
