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
    var Colleague = require('compassion.colleague/http')
    var Staccato = require('staccato')
    var byline = require('byline')

    var logger = require('prolific.logger').createLogger('compassion.channel')

    require('prolific.logger').sink.setLevel('paxos', 'TRACE')
    require('prolific.logger').sink.setLevel('compassion', 'TRACE')
    require('prolific.logger').sink.setLevel('islander', 'TRACE')
    require('prolific.logger').sink.setLevel('kibitz', 'TRACE')

    var shuttle = Shuttle.shuttle(program, logger)

    program.helpIf(program.ultimate.help)

    var stream = program.ultimate.log == null
               ? program.stdin
               : fs.createReadStream(program.ultimate.log)
    var staccato = new Staccato(byline(stream))

    async(function () {
        started(staccato, program.ultimate.island, program.ultimate.id, async())
    }, function (entry) {
        console.log(entry)
        var argv = program.argv.slice()
        var delegate = program.attempt(function () {
            var delegates = [ argv.shift(), entry.argv.shift() ]
            return require(delegates[0] || delegates[1])
        }, /^code:MODULE_NOT_FOUND$/, 'cannot find module')
        var colleague = new Colleague({
            islandName: entry.parameters.island,
            colleagueId: entry.parameters.id,
            timeout: entry.parameters.timeout,
            ping: entry.parameters.ping,
            timerless: true,
            ua: null,
            replaying: true
        })
        program.on('shutdown', shuttle.close.bind(shuttle))

        var messages = [], outOfBandNumber = 0, callbacks = {}
        async(function () {
            delegate(entry.argv.concat(argv), program, async())
        }, function (constructor) {
            constructor({
                colleagueId: colleague.colleagueId,
                kibitzer: colleague.kibitzer,
                replaying: true,
                naturalized: function () {
                    colleague.kibitzer.legislator.naturalize()
                },
                publish: function (message, callback) {
                    false && messages.push({
                        type: 'publish',
                        message: JSON.parse(JSON.stringify(message))
                    })
                    callback()
                },
                outOfBand: function (name, post, callback) {
                    var invocation = outOfBandNumber++
                    messages.push({
                        type: 'outOfBand',
                        message: {
                            name: name,
                            post: JSON.parse(JSON.stringify(post)),
                            invocation: invocation
                        }
                    })
                    callbacks[invocation] = callback
                }
            }, true, async())
        }, function (consumer, properties) {
            colleague._setConsumer(consumer, properties)
            replay(staccato, colleague, consumer, messages, callbacks, async())
        })
    })
}))
