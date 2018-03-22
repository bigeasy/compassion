#!/usr/bin/env node

/*

    ___ usage ___ en_US ___
    compassion conduit <child options>

    options:

        -b, --bind <address:port>
            address and port to bind to

        --help
            display help message

    ___ $ ___ en_US ___

        bind is required:
            the `--bind` argument is a required argument

    ___ . ___

 */
require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.ultimate.help)
    program.required('bind')

    program.validate(require('arguable/bindable'), 'bind')

    var delta = require('delta')

    var http = require('http')

    var Operation = require('operation/variadic')

    var Shuttle = require('prolific.shuttle')

    var Destructible = require('destructible')
    var destructible = new Destructible(3000, 'compassion.conduit')

    var Rendezvous = require('assignation/rendezvous')
    var Downgrader = require('downgrader')

    var Middleware = require('./middleware')

    var destroyer = require('server-destroy')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('compassion.conduit')

    var shuttle = Shuttle.shuttle(program, logger)

    destructible.destruct.wait(shuttle, 'close')

    var bind = program.ultimate.bind

    destructible.completed.wait(async())

    async(function () {
        destructible.monitor('rendezvous', Rendezvous, async())
    }, function (rendezvous) {
        var downgrader = new Downgrader

        downgrader.on('socket', Operation([ rendezvous, 'upgrade' ]))

        var connect = require('connect')
        var app = require('connect')()
            .use(Operation([ rendezvous, 'middleware' ]))
            .use(new Middleware(rendezvous).reactor.middleware)

        var server = http.createServer(app)

        destroyer(server)

        server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

        destructible.destruct.wait(server, 'destroy')

        async(function () {
            server.listen(bind.port, bind.address, async())
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    }, function () {
        logger.info('started', { paraemters: program.ultimate })
        program.ready.unlatch()
    })
}))
