var cadence = require('cadence')

var Middleware = require('./middleware')

var Rendezvous = require('assignation/rendezvous')
var Downgrader = require('downgrader')

var destroyer = require('server-destroy')

var delta = require('delta')

var http = require('http')

var Operation = require('operation/variadic')

module.exports = cadence(function (async, destructible, port, address) {
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
            server.listen(port, address, async())
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    })
})
