#!/usr/bin/env node

/*

    ___ usage ___ en_US ___
    compassion conduit <child options>

    options:

        -b, --bind <address:port>
            address and port to bind to

        -i, --id <string>
            conduit id

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
    var http = require('http')
    var destroyer = require('server-destroy')

    var Shuttle = require('prolific.shuttle')

    var Conduit = require('./http.js')

    var logger = require('prolific.logger').createLogger('compassion.conduit')

    var shuttle = Shuttle.shuttle(program, logger)

    program.helpIf(program.ultimate.help)
    program.required('bind', 'id')

    program.validate(require('arguable/bindable'), 'bind')

    var bind = program.ultimate.bind

    var ws = require('ws')
    var conduit = new Conduit(program.ultimate.id)
    var server = http.createServer(conduit.dispatcher.createWrappedDispatcher())
    new ws.Server({ server: server }).on('connection', conduit.connection.bind(conduit))
    destroyer(server)
    server.listen(bind.port, bind.address, async())
    program.on('shutdown', server.destroy.bind(server))
    program.on('shutdown', shuttle.close.bind(shuttle))
}))
