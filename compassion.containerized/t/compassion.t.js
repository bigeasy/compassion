require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Sidecar = require('../sidecar')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/compassion.t.js')
    var Application = require('./application')
    var destroyer = require('server-destroy')
    var http = require('http')
    var delta = require('delta')

    var applications = []

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('sidecar', Sidecar, {
            bind: {
                local: {
                    listen: function (server, callback) {
                        server.listen(8386, '127.0.0.1', callback)
                    }
                },
                networked: {
                    listen: function (server, callback) {
                        server.listen(8486, '127.0.0.1', callback)
                    },
                    address: '127.0.0.1',
                    port: 8486
                }
            }
        }, async())
    }, function () {
        var application = new Application('first', okay)
        applications.push(application)
        async(function () {
            var server = http.createServer(application.reactor.middleware)
            destroyer(server)
            destructible.destruct.wait(server, 'destroy')
            delta(destructible.monitor('first')).ee(server).on('close')
            server.listen(8088, '127.0.0.1', async())
        }, function () {
            application.register('http://127.0.0.1:8088/', async())
        }, function () {
            destructible.destruct.wait(application.arrived, 'unlatch')
            application.arrived.wait(async())
        })
    }, function () {
    })
}
