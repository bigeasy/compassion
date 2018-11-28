require('proof')(3, prove)

function prove (okay, callback) {
   // try {
        var Conference = require('../../compassion.conference/conference')
    //} catch (e) {
     //   var Conference = require('compassion.conference/conference')
      //  var Pinger = require('compassion.conference/pinger')
  //  }

    var Counterfeiter = require('../../compassion.counterfeiter')(Conference)
    var Procession = require('procession')
    var Containerized = require('../containerized')
    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 't/compassion.t.js')
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
    var containerized

    cadence(function (async) {
        async(function () {
            destructible.durable('containerized', Containerized, {
                Conference: Conference,
                population: {
                    called: 0,
                    census: function (island, id, callback) {
                        if (this.called++ != 0) {
                            if (id == 'racer') {
                                containerized.terminate('island', 'racer')
                            }
                            population.census(island, id, callback)
                        } else {
                            callback(null, [])
                        }
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
                    networked: {
                        listen: function (server, callback) {
                            server.listen(8486, '127.0.0.1', callback)
                        },
                        address: '127.0.0.1',
                        port: 8486
                    }
                }
            }, async())
        }, function ($containerized) {
            containerized = $containerized
            var merged = new Procession
            var writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))
            destructible.durable('events', containerized.events.pump(merge), 'destructible', null)
            function merge (envelope) {
                if (envelope != null) {
                    merged.push(envelope)
                } else {
                    console.log('intercepted null')
                }
            }
            destructible.durable('merged', merged.pump(function (envelope, callback) {
                if (envelope == null) {
                    writable.end(callback)
                } else {
                    writable.write(JSON.stringify(envelope) + '\n', callback)
                }
            }), 'destructible', null)
            var applications = {}
            var count = 1
            var createApplication = cadence(function (async, destructible, id) {
                var application = new Application
                async(function () {
                    destructible.durable('counterfeiter', Counterfeiter, containerized, application, {
                        island: 'island',
                        id: id
                    }, async())
                }, function (conference) {
                    destructible.durable('events', conference.events.pump(merge), 'destructible', null)
                    applications[id] = {
                        application: application,
                        conference: conference
                    }
                    return []
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
                    destructible.durable('first', createApplication, 'first', async())
                }, function () {
                //    applications.first.conference.ready(async())
                }, function () {
                    applications.first.application.arrived.wait(async())
                }, function () {
                    console.log('arrived first')
                })
            }, function () {
                async(function () {
                    destructible.ephemeral('racer', createApplication, 'racer', async())
                }, function () {
                    console.log('racer built')
//                    applications.racer.conference.ready(async())
                })
            }, function () {
                async(function () {
                    destructible.ephemeral('second', createApplication, 'second', async())
                }, function () {
                    console.log('built second')
                 //   applications.second.conference.ready(async())
                }, function () {
                    applications.second.application.arrived.wait(async())
                }, function () {
                    console.log('arrived second')
                    applications.second.application.envelopes.shifter().join(function (envelope) {
                        console.log(envelope)
                        return envelope.method == 'receive'
                    }, async())
                    applications.first.conference.broadcast('name', { value: 1 })
                })
            }, function () {
                async(function () {
                    destructible.durable('third', createApplication, 'third', async())
                }, function () {
                  //  applications.third.conference.ready(async())
                }, function () {
                    applications.third.application.arrived.wait(async())
                }, function () {
                    okay(containerized.ids('missing').length, 0, 'no ids')
                    containerized.terminate('missing')
                    containerized.terminate('island', 'fourth')
                    containerized.terminate('island', 'second')
                    applications.third.application.envelopes.shifter().join(function (envelope) {
                        return envelope.method == 'depart'
                    }, async())
                }, function () {
                    containerized.terminate('island', 'first')
                    async.loop([], function () {
                        async(function () {
                            if (containerized.ids('island').length == 0) {
                                return [ async.break ]
                            }
                            setTimeout(async(), 1000)
                        })
                    })
                })
            })
        })
    })(destructible.durable('test'))
}
