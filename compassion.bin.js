/*

    ___ usage ___ en_US ___
    compassion <options>

    options:

        -b, --bind      <address:port>  address and port to bind to
        --help                          display help message

    ___ $ ___ en_US ___

        bind is required:
            the `--bind` argument is a required argument

        name is required:
            the `--name` argument is a required argument
    ___ . ___

 */
require('arguable')(module, require('cadence')(function (async, program) {
    var http = require('http')

    var prolific = require('prolific')
    var Shuttle = require('prolific.shuttle')

    var Compassion = require('./http.js')

    var logger = prolific.createLogger('bigeasy.compassion.bin')

    program.helpIf(program.command.param.help)
    program.command.required('bind')

    var bind = program.command.bind('bind')

    async(function () {
        Shuttle.shuttle(program, 1000, {}, logger, async())
    }, function () {
        var resolver = new Resolver(program.command.param.name)
        var dispatcher = resolver.dispatcher.createWrappedDispatcher()
        var server = http.createServer(dispatcher)
        server.listen(bind.port, bind.address, async())
        program.on('SIGINT', server.close.bind(server))
    })
}))
