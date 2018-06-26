#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: mingle <protocol> <protocol args>

        --help
            display this message

        --compassion <string>
            local compassion interface

        --id <string>
            compassion id

        --bind <string>
            address to bind to

    ___ $ ___ en_US ___
    ___ . ___
*/
require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.ultimate.help)

    program.required('compassion', 'id', 'bind')
    program.validate(require('arguable/bindable'), 'bind')

    var http = require('http')
    var destroyer = require('server-destroy')

    var Destructible = require('destructible')
    var destructible = new Destructible('application.bin')
    var delta = require('delta')

    var Application = require('./application')

    var application = new Application(program.ultimate.id, function () {})

    async(function () {
        var server = http.createServer(application.reactor.middleware)
        destroyer(server)
        destructible.destruct.wait(server, 'destroy')
        delta(destructible.monitor('http')).ee(server).on('close')
        program.ultimate.bind.listen(server, async())
    }, function () {
        application.register(program.ultimate.compassion, async())
    })
}))
