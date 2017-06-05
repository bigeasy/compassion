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

    var Middleware = require('./middleware')
    var Shuttle = require('prolific.shuttle')

    var Destructible = require('destructible')

    var destructible = new Destructible('compassion.conduit')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('compassion.conduit')

    var shuttle = Shuttle.shuttle(program, logger)

    var Downgrader = require('downgrader')
    var downgrader = new Downgrader

    var Rendezvous = require('assignation/rendezvous')
    var rendezvous = new Rendezvous

    downgrader.on('socket', Operation([ rendezvous, 'upgrade' ]))

    var connect = require('connect')
    var app = require('connect')()
        .use(Operation([ rendezvous, 'middleware' ]))
        .use(new Middleware(rendezvous).reactor.middleware)

    var server = http.createServer(app)

    server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

    var bind = program.ultimate.bind

    destructible.addDestructor('server', server, 'close')
    destructible.addDestructor('shuttle', shuttle, 'close')
    destructible.addDestructor('rendezvous', rendezvous, 'destroy')

    async(function () {
        server.listen(bind.port, bind.address, async())
    }, function () {
        logger.info('started', { bind: bind })
        delta(async()).ee(server).on('close')
        program.ready.unlatch()
    })
}))
