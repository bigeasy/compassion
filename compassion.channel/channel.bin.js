#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: compassion channel <args>

        --help
            display this message

        --local <string>
            local interface and port

        --id <string>
            local interface and port
    ___ $ ___ en_US ___
    ___ . ___
*/
require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.ultimate.help)

    program.required('local', 'id')
    program.validate(require('arguable/bindable'), 'local')

    var Staccato = require('staccato')
    var byline = require('byline')

    var Conference = require('compassion.conference/conference')

    var Destructible = require('destructible')
    var destructible = new Destructible('channel.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.completed.wait(async())

    var Replay = require('./replay')

    async([function () {
        destructible.destroy()
    }], function () {
        var readable = new Staccato.Readable(byline(program.stdin))
        destructible.monitor('replay', Replay, {
            Conference: Conference,
            readable: readable,
            id: program.ultimate.id,
            bind: program.ultimate.local
        }, async())
    }, function () {
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
