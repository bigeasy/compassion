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
    var fs = require('fs')
    var Channel = require('./channel')
    var Merger = require('./merger')
    var Staccato = require('staccato')
    var Recorder = require('./recorder')
    var byline = require('byline')

    var Conduit = require('conduit')

    var logger = require('prolific.logger').createLogger('compassion.channel')

    var shuttle = Shuttle.shuttle(program, logger)
    var Monitor = require('compassion.colleague/monitor')
    var Kibitzer = require('kibitz')
    var coalesce = require('extant')
    var Destructor = require('destructible')
    var cadence = require('cadence')

    var Thereafter = require('thereafter')

    var Reader = require('./reader')

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

    kibitzer.played.shifter().pump(new Recorder('kibitz', logger, merger.play), 'enqueue')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger, merger.play), 'enqueue')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger, merger.play), 'enqueue')

    var destructible = new Destructor('channel.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.addDestructor('shuttle', shuttle, 'close')

    var thereafter = new Thereafter
    destructible.addDestructor('thereafter', thereafter, 'cancel')

    thereafter.run(function (ready) {
        cadence(function (async) {
            destructible.addDestructor('monitor', monitor, 'destroy')
            monitor.ready.wait(ready, 'unlatch')
            async(function () {
                monitor.run(program, async())
            }, function (exitCode, signal) {
                logger.info('exited', { exitCode: exitCode, signal: signal })
            })
        })(destructible.monitor('monitor'))
    })

    destructible.addDestructor('channel', channel, 'destroy')

    // Gives an `ENOENT` time to report and cancel the series.
    thereafter.run(function (ready) {
        cadence(function () {
            setImmediate(async())
        }, function () {
            ready.unlatch()
        })(destructible.rescue('startup'))
    })

    thereafter.run(function (ready) {
        var conduit = new Conduit(monitor.child.stdio[3], monitor.child.stdio[3], channel)
        destructible.addDestructor('conduit', conduit, 'destroy')
        destructible.addDestructor('write', channel.write, 'push')
        conduit.ready.wait(ready, 'unlatch')
        conduit.listen(null, destructible.monitor('conduit'))
    })

    thereafter.run(function (ready) {
        var reader = new Reader
        destructible.addDestructor('reader', reader, 'destroy')
        reader.ready.wait(ready, 'unlatch')
        reader.read(stream, merger, destructible.monitor('readable'))
    })
    stream.once('error', function () { console.log(error.stack) })
    monitor.child.stdio[3].once('error', function (error) { console.log(error.stack) })

    thereafter.run(function (ready) {
        destructible.addDestructor('merger', merger, 'destroy')
        merger.ready.wait(ready, 'unlatch')
        merger.merge(destructible.monitor('merger'))
    })

    thereafter.ready.wait(program.ready, 'unlatch')

    destructible.completed(5000, async())
}))
