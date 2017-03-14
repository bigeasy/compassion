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
    var started = require('./started.js')
    var fs = require('fs')
    var Channel = require('./channel')
    var Merger = require('./merger')
    var Staccato = require('staccato')
    var Recorder = require('./recorder')
    var byline = require('byline')

    var logger = require('prolific.logger').createLogger('compassion.channel')

    var shuttle = Shuttle.shuttle(program, logger)
    var Monitor = require('compassion.colleague/monitor')
    var Kibitzer = require('kibitz')
    var coalesce = require('nascent.coalesce')
    var Destructor = require('destructible')
    var Terminator = require('destructible/terminator')
    var cadence = require('cadence')

    program.helpIf(program.ultimate.help)

    var stream = program.ultimate.log == null
               ? program.stdin
               : fs.createReadStream(program.ultimate.log)

    var kibitzer = new Kibitzer({
        id: program.ultimate.id,
        ping: coalesce(program.ultimate.ping, 1000),
        timeout: coalesce(program.ultimate.timeout, 5000)
    })

    var channel = new Channel(kibitzer)
    var monitor = new Monitor

    var merger = new Merger(kibitzer, channel)

    kibitzer.played.pump(new Recorder('kibitz', logger, merger.play))
    kibitzer.paxos.outbox.pump(new Recorder('paxos', logger, merger.play))
    kibitzer.islander.outbox.pump(new Recorder('islander', logger, merger.play))

    var destructor = new Destructor
    destructor.events.pump(new Terminator(1000))

    program.on('shutdown', destructor.destroy.bind(destructor))

    destructor.addDestructor('shuttle', shuttle.close.bind(shuttle))

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
        destructor.async(async, 'connected')(function () {
            destructor.addDestructor('channel', channel.destroy.bind(channel))
            channel.listen(monitor.child.stdio[3], monitor.child.stdio[3], async())
        })
        async(function () {
            channel.connected.wait(async())
        }, function () {
            destructor.async(async, 'readable')(function () {
                var readable = new Staccato.Readable(byline(stream))
                destructor.addDestructor('readable', readable.destroy.bind(readable))
                var loop = async(function () {
                    readable.read(async())
                }, function (line) {
                    async(function () {
                        merger.replay.enqueue(line && JSON.parse(line), async())
                    }, function () {
                        if (line == null) {
                            return [ loop.break ]
                        }
                    })
                })()
            })
            destructor.async(async, 'merger')(function () {
                destructor.addDestructor('merger', { object: merger, method: 'destroy' })
                merger.merge(async())
            })
        })
    })
}))
