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

        name is required:
            the `--name` argument is a required argument
    ___ . ___

 */
require('arguable')(module, require('cadence')(function (async, program) {
    var http = require('http')
    var destroyer = require('server-destroy')

    var prolific = require('prolific')
    var Shuttle = require('prolific.shuttle')

    var Conduit = require('./http.js')

    var logger = prolific.createLogger('bigeasy.compassion.conduit.bin')

    Shuttle.shuttle(program, 1000, logger)

    program.helpIf(program.command.param.help)
    program.command.required('bind')

    var bind = program.command.bind('bind')

    var conduit = new Conduit
    var dispatcher = conduit.dispatcher.createWrappedDispatcher()
    var server = http.createServer(dispatcher)
    destroyer(server)
    server.on('upgrade', conduit.onupgrade)
    server.listen(bind.port, bind.address, async())
    program.on('SIGINT', server.destroy.bind(server))
}))
