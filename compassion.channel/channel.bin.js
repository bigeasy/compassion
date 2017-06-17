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
    var coalesce = require('extant')
    var Destructor = require('destructible')
    var cadence = require('cadence')

    var Thereafter = require('thereafter')

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

    kibitzer.played.pump(new Recorder('kibitz', logger, merger.play), 'enqueue')
    kibitzer.paxos.outbox.pump(new Recorder('paxos', logger, merger.play), 'enqueue')
    kibitzer.islander.outbox.pump(new Recorder('islander', logger, merger.play), 'enqueue')

    var destructor = new Destructor('channel.bin')

    program.on('shutdown', destructor.destroy.bind(destructor))

    destructor.addDestructor('shuttle', shuttle.close.bind(shuttle))

    var thereafter = new Thereafter
    destructor.addDestructor('thereafter', thereafter, 'cancel')

    thereafter.run(function (ready) {
        cadence(function (async) {
            destructor.addDestructor('monitor', monitor, 'destroy')
            monitor.ready.wait(ready, 'unlatch')
            async(function () {
                monitor.run(program, async())
            }, function (exitCode, signal) {
                console.log('exit', exitCode)
                logger.info('exited', { exitCode: exitCode, signal: signal })
            })
        })(destructor.monitor('monitor'))
    })

    thereafter.run(function (ready) {
        destructor.addDestructor('channel', channel.destroy.bind(channel))
        channel.ready.wait(ready, 'unlatch')
        channel.listen(monitor.child.stdio[3], monitor.child.stdio[3], destructor.monitor('connected'))
    })

    thereafter.run(function (ready) {
        cadence(function (async) {
            var readable = new Staccato.Readable(byline(stream))
            destructor.addDestructor('readable', readable.destroy.bind(readable))
            var loop = async(function () {
                readable.read(async())
                ready.unlatch()
            }, function (line) {
                async(function () {
                    merger.replay.enqueue(line && JSON.parse(line.toString()), async())
                }, function () {
                    console.log('done')
                    if (line == null) {
                        return [ loop.break ]
                    }
                })
            })()
        })(destructor.monitor('readable'))
    })

    thereafter.run(function (ready) {
        destructor.addDestructor('merger', merger, 'destroy')
        merger.ready.wait(ready, 'unlatch')
        merger.merge(destructor.monitor('merger'))
    })

    destructor.completed(1000, async())
}))
