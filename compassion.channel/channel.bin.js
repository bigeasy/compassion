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
    var Destructible = require('destructible')
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

    kibitzer.played.shifter().pump(new Recorder('kibitz', logger, merger.play), 'push')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', logger, merger.play), 'push')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', logger, merger.play), 'push')

    var destructible = new Destructible('channel.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.addDestructor('shuttle', shuttle, 'close')

    var finalist = require('finalist')

    destructible.completed.wait(async())

    var Descendent = require('descendent')
    var descendent = new Descendent(program)

    destructible.addDestructor('descendent', descendent, 'decrement')

    async([function () {
        destructible.destroy()
    }], function  () {
        destructible.addDestructor('monitor', monitor, 'destroy')
        cadence(function (async) {
            async(function () {
                monitor.run(program, descendent, async())
            }, function (exitCode, signal) {
                logger.info('exited', { exitCode: exitCode, signal: signal })
            })
        })(destructible.monitor('monitor'))
        finalist(function (callback) {
            monitor.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        destructible.addDestructor('channel', channel, 'destroy')
        setImmediate(async())
    }, function () {
        var conduit = new Conduit(monitor.child.stdio[3], monitor.child.stdio[3], channel)
        destructible.addDestructor('conduit', conduit, 'destroy')
        destructible.addDestructor('write', channel.write, 'push')
        conduit.listen(null, destructible.monitor('conduit'))
        finalist(function (callback) {
            conduit.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        var reader = new Reader
        destructible.addDestructor('reader', reader, 'destroy')
        reader.read(stream, merger.replay, destructible.rescue('readable'))
        finalist(function (callback) {
            reader.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        destructible.addDestructor('merger', merger, 'destroy')
        merger.merge(destructible.monitor('merger'))
        finalist(function (callback) {
            merger.ready.wait(callback)
            destructible.completed.wait(callback)
        }, async())
    }, function () {
        logger.info('started', { parameters: program.utlimate, argv: program.argv })
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
