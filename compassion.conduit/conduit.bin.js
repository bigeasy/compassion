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

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('compassion.conduit')

    var shuttle = Shuttle.shuttle(program, logger)

    var Conduit = require('./conduit')
    var conduit = new Conduit()

    destructible.addDestructor('shuttle', shuttle, 'close')
    destructible.addDestructor('conduit', conduit, 'destroy')

    var bind = program.ultimate.bind
    conduit.listen(bind.port, bind.address, async())
    conduit.ready.wait(program.ready, 'unlatch')
    logger.info('started', { paraemters: program.ultimate })
    destructible.completed.wait(async())
}))
