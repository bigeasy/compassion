#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: compassion channel <args>

        --help
            display this message

        --id <string>
            local interface and port
    ___ $ ___ en_US ___
    ___ . ___
*/
require('arguable')(module, function (program, callback) {
    program.helpIf(program.ultimate.help)

    program.required('id')

    var Staccato = require('staccato')
    var byline = require('byline')

    var Conference = require('compassion.conference/conference')

    var Destructible = require('destructible')
    var destructible = new Destructible('channel.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    var Replay = require('./replay')

    cadence(function (async) {
        async(function () {
            program.stdin.resume()
            var readable = new Staccato.Readable(byline(program.stdin))
            /*
            destructible.monitor('replay', Replay, {
                Conference: Conference,
                readable: readable,
                id: program.ultimate.id,
                bind: program.ultimate.local
            }, async())
                */
        }, function () {
            program.ready.unlatch()
        })
    })(destructible.monitor('test'))
})
