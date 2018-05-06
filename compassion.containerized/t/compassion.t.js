require('proof')(15, require('cadence')(prove))

function prove (async, okay) {
    var Containerized = require('../containerized')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/compassion.t.js')
    var Application = require('./application')
    var destroyer = require('server-destroy')
    var http = require('http')
    var delta = require('delta')
    var cadence = require('cadence')
    var Vizsla = require('vizsla')
    var ua = new Vizsla
    var fs = require('fs')
    var path = require('path')

    var Population = require('../population')
    var Resolver = { Static: require('../resolver/static') }

    var applications = []

    var events = null

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
        destructible.monitor('containerized', Containerized, {
            population: new Population(new Resolver.Static([ 'http://127.0.0.1:8486/' ]), new Vizsla),
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
    }, function (containerized) {
        events = containerized.events.shifter()
        async(function () {
            ua.fetch({ url: 'http://127.0.0.1:8386' }, async())
        }, function (body) {
            okay(body, 'Compassion Local API\n', 'local index')
            ua.fetch({ url: 'http://127.0.0.1:8486' }, async())
        }, function (body) {
            okay(body, 'Compassion Networked API\n', 'networked index')
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8386/',
            }, {
                url: './backlog'
            }, async())
        }, function (body, response) {
            okay(response.statusCode, 401, 'no authorization')
            ua.fetch({
                url: 'http://127.0.0.1:8386/',
            }, {
                token: 'x',
                url: './backlog'
            }, async())
        }, function (body, response) {
            okay(response.statusCode, 401, 'not found')
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
                    containerized.events.shifter().join(function (event) {
                        if (
                            event.type == 'entry' &&
                            event.id == 'third' &&
                            event.body.promise == '6/0'
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
            }, function () {
                application.broadcast(1, async())
            }, function () {
                var application = new Application('fourth', okay)
                applications.push(application)
                async(function () {
                    var server = http.createServer(application.reactor.middleware)
                    destroyer(server)
                    destructible.destruct.wait(server, 'destroy')
                    delta(destructible.monitor('fourth')).ee(server).on('close')
                    server.listen(8082, '127.0.0.1', async())
                }, function () {
                    application.register('http://127.0.0.1:8082/', async())
                }, function () {
                    destructible.destruct.wait(application.arrived, 'unlatch')
                    application.arrived.wait(async())
                })
            }, function () {
                containerized.events.shifter().join(function (event) {
                    if (
                        event.type == 'entry' &&
                        event.id == 'third' &&
                        event.body.promise == '8/0'
                    ) {
                        return true
                    }
                    return false
                }, async())
                applications[2].blocker.notify()
            }, function () {
                containerized.events.shifter().join(function (event) {
                    if (
                        event.type == 'entry' &&
                        event.id == 'second' &&
                        event.body.promise == '8/2'
                    ) {
                        return true
                    }
                    return false
                }, async())
                application.broadcast(1, async())
            }, function () {
                var application = new Application('fifth', okay)
                applications.push(application)
                async(function () {
                    var server = http.createServer(application.reactor.middleware)
                    destroyer(server)
                    destructible.destruct.wait(server, 'destroy')
                    delta(destructible.monitor('fifth')).ee(server).on('close')
                    server.listen(8083, '127.0.0.1', async())
                }, function () {
                    application.register('http://127.0.0.1:8083/', async())
                }, function () {
                    destructible.destruct.wait(application.arrived, 'unlatch')
                    application.arrived.wait(async())
                })
            }, function () {
                containerized.events.shifter().join(function (event) {
                    if (
                        event.type == 'entry' &&
                        event.id == 'third' &&
                        event.body.promise == 'a/0'
                    ) {
                        return true
                    }
                    return false
                }, async())
                applications[2].blocker.notify()
            })
        }, function () {
            setTimeout(async(), 1000)
        }, function () {
            destructible.destroy()
        }, function () {
            var writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))
            var shifter = events.shifter()
            var loop = async(function () {
                async(function () {
                    shifter.dequeue(async())
                }, function (envelope) {
                    if (envelope == null) {
                        writable.end()
                        return [ loop.break ]
                    } else {
                        writable.write(JSON.stringify(envelope) + '\n', async())
                    }
                })
            })()
        })
    })
}
