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
    var byline = require('byline')

    var logger = require('prolific.logger').createLogger('compassion.channel')

    var shuttle = Shuttle.shuttle(program, logger)
    var Monitor = require('compassion.colleague/monitor')
    var Kibitzer = require('kibitz')
    var coalesce = require('nascent.coalesce')
    var Destructor = require('destructible')
    var cadence = require('cadence')

    var channel = new Channel
    var monitor = new Monitor

    program.helpIf(program.ultimate.help)

    var stream = program.ultimate.log == null
               ? program.stdin
               : fs.createReadStream(program.ultimate.log)


    var kibitzer = new Kibitzer({
        id: program.ultimate.id,
        ping: coalesce(program.ultimate.ping, 1000),
        timeout: coalesce(program.ultimate.timeout, 5000)
    })

    var merger = new Merger(kibitzer, channel)

    var destructor = new Destructor
    program.on('shutdown', destructor.destroy.bind(destructor))

    destructor.addDestructor('shuttle', shuttle.close.bind(shuttle))

    destructor.destructible(cadence(function (async) {
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
        destructor.destructible(cadence(function (async) {
            destructor.addDestructor('channel', channel.destroy.bind(channel))
            channel.listen(monitor.child.stdio[3], monitor.child.stdio[3], async())
            async(function () {
                channel.connected.wait(async())
            }, function () {
                destructor.destructible(cadence(function (async) {
                    var readable = new Staccato.Readable(byline(stream))
                    destructor.addDestructor('readable', readable.destroy.bind(readable))
                    var loop = async(function () {
                        readable.read(async())
                    }, function (line) {
                        if (line == null) {
                            merger.log.push(null)
                            return [ loop.break ]
                        }
                        merger.log.enqueue(JSON.parse(line), async())
                    })()
                    merger.replay(async())
                }), async())
            })
        }), async())
    })
}))
