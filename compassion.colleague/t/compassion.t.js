require('proof')(2, prove)

function prove (okay, callback) {
   // try {
        var Conference = require('../../compassion.conference/conference')
    //} catch (e) {
     //   var Conference = require('compassion.conference/conference')
      //  var Pinger = require('compassion.conference/pinger')
  //  }
    var Procession = require('procession')
    var Containerized = require('../containerized')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/compassion.t.js')
    var Application = require('./application')
    var cadence = require('cadence')
    var Vizsla = require('vizsla')
    var ua = new Vizsla
    var fs = require('fs')
    var path = require('path')

    var Population = require('../population')
    var Resolver = { Static: require('../resolver/static') }

    var applications = []

    var events = null

    destructible.completed.wait(callback)

    var population = new Population(new Resolver.Static([ 'http://127.0.0.1:8486/' ]), new Vizsla)

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('containerized', Containerized, {
                Conference: Conference,
                population: {
                    census: function (island, id, callback) {
                        if (id == 'racer') {
                            console.log('will terminate')
                            containerized.terminate('island', 'racer')
                        }
                        population.census(island, id, callback)
                    }
                },
                ping: {
                    chaperon: 150,
                    paxos: 150,
                    application: 150
                },
                timeout: {
                    chaperon: 450,
                    paxos: 450,
                    http: 500
                },
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
            var merged = new Procession
            var writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))
            destructible.monitor('events', containerized.events.pump(merged, 'enqueue'), 'destructible', null)
            destructible.monitor('merged', merged.pump(function (envelope, callback) {
                if (envelope == null) {
                    writable.end(callback)
                } else {
                    writable.write(JSON.stringify(envelope) + '\n', callback)
                }
            }), 'destructible', null)
            var applications = {}
            var createApplication = cadence(function (async, destructible, id) {
                var application = new Application(id, okay)
                var inbox = new Procession, outbox = new Procession
                destructible.destruct.wait(inbox, 'end')
                destructible.destruct.wait(outbox, 'end')
                async(function () {
                    containerized.register(inbox, outbox, { island: 'island', id: id, snapshot: true }, async())
                    destructible.monitor('conference', Conference, outbox, inbox, application, {}, async())
                }, function (colleague, conference) {
                    destructible.monitor('events', conference.events.pump(merged, 'enqueue'), 'destructible', null)
                    applications[id] = {
                        application: application,
                        colleague: colleague,
                        conference: conference
                    }
                    return [ conference ]
                })
            })
            async(function () {
                ua.fetch({ url: 'http://127.0.0.1:8486', parse: 'text' }, async())
            }, function (body) {
                okay(body, 'Compassion Networked API\n', 'networked index')
                ua.fetch({ url: 'http://127.0.0.1:8486/island/island/islanders', parse: 'json' }, async())
            }, function (body) {
                okay(body, [], 'empty island')
                async(function () {
                    destructible.monitor('first', createApplication, 'first', async())
                }, function () {
                    applications.first.conference.ready(async())
                }, function () {
                    applications.first.application.arrived.wait(async())
                }, function () {
                    console.log('--- arrival -----------')
                })
            }, function () {
                async(function () {
                    destructible.monitor('second', createApplication, 'second', async())
                }, function () {
                    applications.second.conference.ready(async())
                }, function () {
                    applications.second.application.arrived.wait(async())
                }, function () {
                    console.log('--- arrival -----------')
                })
            })
        })
    })(destructible.monitor('test'))

    return

    var containerized

    async([function () {
        destructible.destroy()
    }], function () {
    }, function () {
        containerized = arguments[0]
        var writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))
        events = containerized.events.shifter()
        containerized.events.pump(function (envelope, callback) {
            if (envelope == null) {
                console.log('very much done')
                writable.end(callback)
            } else {
                writable.write(JSON.stringify(envelope) + '\n', callback)
            }
        }, destructible.monitor('events'))
        async(function () {
            ua.fetch({ url: 'http://127.0.0.1:8386', parse: 'text' }, async())
        }, function (body) {
            okay(body, 'Compassion Local API\n', 'local index')
            ua.fetch({ url: 'http://127.0.0.1:8486', parse: 'text' }, async())
        }, function (body) {
            okay(body, 'Compassion Networked API\n', 'networked index')
            ua.fetch({ url: 'http://127.0.0.1:8486/island/island/islanders', parse: 'json' }, async())
        }, function (body) {
            okay(body, [], 'empty island')
            ua.fetch({
                url: 'http://127.0.0.1:8386/',
            }, {
                url: './snapshot'
            }, async())
        }, function (body, response) {
            okay(response.statusCode, 401, 'no authorization')
            ua.fetch({
                url: 'http://127.0.0.1:8386/',
            }, {
                token: 'x',
                url: './snapshot'
            }, async())
        }, function (body, response) {
            okay(response.statusCode, 401, 'not found')
            ua.fetch({
                url: 'http://127.0.0.1:8386/'
            }, {
                url: '/register',
                post: {
                    token: 'x',
                    island: 'island',
                    id: 'racer',
                    url: 'http://127.0.0.1:8099',
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
                ua.fetch({
                    url: 'http://127.0.0.1:8386/'
                }, {
                    url: '/register',
                    post: {
                        token: 'x',
                        island: 'island',
                        id: 'unregisterable',
                        url: 'http://127.0.0.1:8088',
                    }
                }, async())
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
            containerized.terminate('missing')
            containerized.terminate('island', 'eighth')
            applications[0].pingStatusCode = 503
        }, function () {
            containerized.events.shifter().join(function (event) {
                if (
                    event.type == 'entry' &&
                    event.id == 'fifth' &&
                    event.body.promise == '10/0'
                ) {
                    return true
                }
                return false
            }, async())
        }, function () {
            okay(containerized.ids('x'), [], 'no colleagues')
            okay(containerized.ids('island'), [ 'fifth', 'second', 'third' ], 'active colleagues')
            containerized.health(async())
        }, function (health) {
            okay(Object.keys(health.islands.island).sort(), [ 'fifth', 'second', 'third' ], 'health')
            containerized.terminate('island', 'second')
            containerized.terminate('island', 'third')
        }, function () {
            var loop = async(function () {
                async(function () {
                    if (containerized.ids('island').length == 0) {
                        return [ loop.break ]
                    }
                }, function () {
                    setTimeout(async(), 1000)
                })
            })()
        }, function () {
            destructible.destroy()
        }, function () {
            setTimeout(async(), 250)
        }, function () {
            containerized.events.push(null)
        }, function () {
            setTimeout(async(), 1000)
        })
    })
}
