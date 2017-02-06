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

    var http = require('http')

    var Conduit = require('./http')
    var Shuttle = require('prolific.shuttle')

    var logger = require('prolific.logger').createLogger('compassion.conduit')

    var shuttle = Shuttle.shuttle(program, logger)

    var Upgrader = require('nascent.upgrader/upgrade')
    var upgrader = new Upgrader

    var Rendezvous = require('nascent.rendezvous/rendezvous')
    var rendezvous = new Rendezvous

    upgrader.on('socket', rendezvous.upgrade.bind(rendezvous))

    var connect = require('connect')
    var app = require('connect')()
        .use(new Conduit(rendezvous).dispatcher.createWrappedDispatcher())
        .use(rendezvous.middleware.bind(rendezvous))

    var server = http.createServer(app)

    server.on('upgrade', upgrader.upgrade.bind(upgrader))

    var bind = program.ultimate.bind

    program.on('shutdown', server.close.bind(server))
    program.on('shutdown', shuttle.close.bind(shuttle))
    program.on('shutdown', rendezvous.close.bind(rendezvous))

    server.listen(bind.port, bind.address, async())

    logger.info('started', { bind: bind })
}))
