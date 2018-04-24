require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var Sidecar = require('../sidecar')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/compassion.t.js')
    var Application = require('./application')
    var destroyer = require('server-destroy')
    var http = require('http')
    var delta = require('delta')
    var cadence = require('cadence')
    var Vizsla = require('vizsla')
    var ua = new Vizsla

    var applications = []

    async([function () {
        destructible.completed.wait(async())
    }, function (error) {
        console.log(error.stack)
        throw error
    }])

    destructible.destruct.wait(function () {
        console.log('is destructing!!!!')
    })

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
    }, function (sidecar) {
        async(function () {
            ua.fetch({ url: 'http://127.0.0.1:8386' }, async())
        }, function (body) {
            okay(body, 'Compassion Local API\n', 'local index')
            ua.fetch({ url: 'http://127.0.0.1:8486' }, async())
        }, function (body) {
            okay(body, 'Compassion Networked API\n', 'networked index')
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
            var application = new Application('second', okay)
            applications.push(application)
            async(function () {
                var server = http.createServer(application.reactor.middleware)
                destroyer(server)
                destructible.destruct.wait(server, 'destroy')
                delta(destructible.monitor('second')).ee(server).on('close')
                server.listen(8089, '127.0.0.1', async())
            }, function () {
                application.register('http://127.0.0.1:8089/', async())
            }, function () {
                destructible.destruct.wait(application.arrived, 'unlatch')
                application.arrived.wait(async())
            })
        }, function () {
            var application = new Application('third', okay)
            applications.push(application)
            async(function () {
                var server = http.createServer(application.reactor.middleware)
                destroyer(server)
                destructible.destruct.wait(server, 'destroy')
                delta(destructible.monitor('second')).ee(server).on('close')
                server.listen(8081, '127.0.0.1', async())
            }, function () {
                async(function () {
                    sidecar.events.shifter().join(function (event) {
                        if (
                            event.type == 'entry' &&
                            event.id == 'third' &&
                            event.entry.method == 'government'
                        ) {
                            return true
                        }
                        return false
                    }, async())
                }, function () {
                })
                application.register('http://127.0.0.1:8081/', async())
            }, function () {
                destructible.destruct.wait(application.arrived, 'unlatch')
                application.arrived.wait(async())
            })
        }, function () {
        })
    })
}
