require('proof')(2, async (okay) => {
    const axios = require('axios')

    const path = require('path')
    const fs = require('fs')

    const Avenue = require('avenue')

    const Conference = require('../../compassion.conference/conference')
    const Counterfeiter = require('../../compassion.counterfeiter')(Conference)
    const Application = require('./application')
    const Containerized = require('../containerized')
    const Destructible = require('destructible')
    const destructible = new Destructible(1000, 't/compassion.t.js')

    const Population = require('../population')
    const Resolver = { Static: require('../resolver/static') }

    const resolver = new Resolver.Static([ 'http://127.0.0.1:8486' ])
    const population = new Population(resolver)

    const colleague = await Containerized(destructible.durable('containerized'), {
        Conference: Conference,
        population: {
            called: 0,
            census: function (island) {
                if (this.called++ != 0) {
                    if (island == 'racer') {
                        colleague.terminate(island, 'racer')
                        return []
                    }
                    return population.census(island)
                } else {
                    return []
                }
            },
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
            iface: '127.0.0.1',
            port: 8486
        }
    })

    const response = await axios.get('http://127.0.0.1:8486')
    okay(response.data, 'Compassion Colleague API\n', 'index')

    const writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))

    const merged = new Avenue()
    const events = colleague.events.shifter()
    destructible.durable('events', events.pump(merge))
    destructible.destruct(() => events.destroy())

    function merge (envelope) {
        if (envelope != null) {
            merged.push(envelope)
        } else {
            console.log('intercepted null')
        }
    }

    const applications = {}
    applications.first = colleague.construct('island', 'first', { value: 1 }, Application)

    await applications.first.conference.ready

    const racer = colleague.construct('racer', 'racer', {}, Application)

    await racer.conference.ready

    applications.second = colleague.construct('island', 'second', { value: 2 }, Application)
    await applications.second.conference.ready

    destructible.destroy()

    console.log('destroying')

    await destructible.destructed

    okay('ran')
})
return
require('proof')(3, prove)

function prove (okay, callback) {
    cadence(function (async) {
        async(function () {
            containerized = $containerized
            var merged = new Procession
            var writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))
            destructible.durable('events', containerized.events.pump(merge), 'destructible', null)
            destructible.durable('merged', merged.pump(function (envelope, callback) {
                if (envelope == null) {
                    writable.end(callback)
                } else {
                    writable.write(JSON.stringify(envelope) + '\n', callback)
                }
            }), 'destructible', null)
            var applications = {}
            var count = 1
            async(function () {
                ua.fetch({ url: 'http://127.0.0.1:8486', parse: 'text' }, async())
            }, function (body) {
                okay(body, 'Compassion Networked API\n', 'networked index')
                ua.fetch({ url: 'http://127.0.0.1:8486/island/island/islanders', parse: 'json' }, async())
            }, function (body) {
                okay(body, [], 'empty island')
                async(function () {
                    destructible.ephemeral('first', createApplication, 'first', async())
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
                        console.log('>>>', envelope)
                        return envelope.method == 'depart'
                    }, async())
                }, function () {
                    console.log(containerized.ids('island'))
                    containerized.terminate('island', 'first')
                    console.log(containerized.ids('island'))
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
