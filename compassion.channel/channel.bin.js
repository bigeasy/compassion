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
require('arguable')(module, require('cadence')(function (async, destructible, arguable) {
    arguable.helpIf(arguable.ultimate.help)

    arguable.required('id')

    var Staccato = require('staccato')
    var byline = require('byline')

    var Conference = require('compassion.conference/conference')

    var cadence = require('cadence')

    var Replay = require('./replay')

    arguable.stdin.resume()
    var readable = new Staccato.Readable(byline(arguable.stdin))
    /*
    destructible.monitor('replay', Replay, {
        Conference: Conference,
        readable: readable,
        id: program.ultimate.id,
        bind: program.ultimate.local
    }, async())
        */
    return []
}))
