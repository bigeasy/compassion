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
            destructible.monitor('containerized', Containerized, {
                Conference: Conference,
                population: {
                    called: 0,
                    census: function (island, id, callback) {
                            console.log('here i am', id, this.called)
                        if (this.called++ != 0) {
                            if (id == 'racer') {
                                console.log('will terminate')
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
            destructible.monitor('events', containerized.events.pump(merged, 'enqueue'), 'destructible', null)
            destructible.monitor('merged', merged.pump(function (envelope, callback) {
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
                    destructible.monitor('counterfeiter', Counterfeiter, containerized, application, {
                        island: 'island',
                        id: id
                    }, async())
                }, function (conference) {
                    destructible.monitor('events', conference.events.pump(merged, 'enqueue'), 'destructible', null)
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
                    destructible.monitor('first', createApplication, 'first', async())
                }, function () {
                //    applications.first.conference.ready(async())
                }, function () {
                    applications.first.application.arrived.wait(async())
                }, function () {
                })
            }, function () {
                async(function () {
                    destructible.monitor('racer', createApplication, 'racer', async())
                }, function () {
//                    applications.racer.conference.ready(async())
                })
            }, function () {
                async(function () {
                    destructible.monitor('second', createApplication, 'second', async())
                }, function () {
                 //   applications.second.conference.ready(async())
                }, function () {
                    applications.second.application.arrived.wait(async())
                }, function () {
                    applications.second.application.envelopes.shifter().join(function (envelope) {
                        return envelope.method == 'receive'
                    }, async())
                    applications.first.conference.broadcast('name', { value: 1 })
                })
            }, function () {
                async(function () {
                    destructible.monitor('third', createApplication, 'third', async())
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
                    var loop = async(function () {
                        async(function () {
                            console.log(containerized.ids('island'))
                            if (containerized.ids('island').length == 0) {
                                return [ loop.break ]
                            }
                            setTimeout(async(), 1000)
                        })
                    })()
                }, function () {
                    console.log('existing')
                })
            })
        })
    })(destructible.monitor('test'))
}
