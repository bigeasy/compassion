#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: compassion colleague <protocol args>

        --help
            display this message

        --local <string>
            local interface and port

        --network <string>
            network interface and port

        --discovery <string>
            path to midle discovery or self discovery if missing

    ___ $ ___ en_US ___
    ___ . ___
*/
require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.ultimate.help)

    program.required('local', 'network', 'discovery')
    program.validate(require('arguable/bindable'), 'local', 'network')

    var Caller = require('conduit/caller')
    var cadence = require('cadence')

    var Olio = require('olio')

    var Containerized = require('./containerized')

    var Destructible = require('destructible')
    var destructible = new Destructible('colleague.bin')

    var Conference = require('compassion.conference/conference')
    var Pinger = require('compassion.conference/pinger')

    var Population = require('./population')
    var UserAgent = require('vizsla')

    var Resolver = require('./resolver/procedure')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('compassion.colleague')
    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        var locator = program.ultimate.discovery.split('/')
        async(function () {
            destructible.monitor('olio', Olio, program, function (constructor) {
                constructor.sender(locator, cadence(function (async, destructible) {
                    destructible.monitor('caller', Caller, async())
                }))
            }, async())
        }, function (olio) {
            return new Resolver(olio.sender(locator, 0))
        })
    }, function (resolver) {
        destructible.monitor('containerized', Containerized, {
            Conference: Conference,
            Pinger: Pinger,
            population: new Population(resolver, new UserAgent),
            bind: {
                local: program.ultimate.local,
                networked: program.ultimate.network
            }
        }, async())
    }, function () {
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
