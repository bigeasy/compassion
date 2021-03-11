require('proof')(3, prove)

async function prove (okay) {
    const Destructible = require('destructible')
    const destructible = new Destructible(1000, 't/compassion.t')
    try {
        await test(destructible, okay)
    } finally {
        destructible.destroy()
    }
}

async function test (destructible, okay) {
    destructible.ephemeral('test', async () => {
        const axios = require('axios')

        const assert = require('assert')
        const path = require('path')
        const fs = require('fs')

        const { Queue } = require('avenue')

        const Conduit = require('conduit')

        const Colleague = require('../colleague')
        const Application = require('./application')

        const Population = require('../population')
        const Resolver = { Static: require('../resolver/static') }

        const inbox = new Queue
        const outbox = new Queue

        const resolver = new Resolver.Static([ 'http://127.0.0.1:8486' ])
        const population = new Population(resolver)

        const colleague = new Colleague(destructible.durable('colleague'), {
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
            }
        })
        new Conduit(destructible.durable('colleague'), inbox.shifter(), outbox, (header, queue, shifter) => {
            console.log(new Error().stack)
            colleague.connect(shifter, queue)
        })
        await colleague.reactor.fastify.listen(8486, '127.0.0.1')
        destructible.destruct(() => colleague.reactor.fastify.close())

        const source = new Conduit(destructible.durable('conference'), outbox.shifter(), inbox)

        destructible.destruct(() => inbox.push(null))
        destructible.destruct(() => outbox.push(null))

        const response = await axios.get('http://127.0.0.1:8486')
        okay(response.data, 'Compassion Colleague API\n', 'index')

        const writable = fs.createWriteStream(path.resolve(__dirname, 'entries.jsons'))

        const merged = new Queue()
        const events = colleague.events.shifter()
        destructible.durable('events', async () => {
            for await (const event of events.iterator()) {
                merge(event)
            }
        })
        destructible.destruct(() => events.destroy())

        function merge (envelope) {
            if (envelope != null) {
                merged.push(envelope)
            } else {
                console.log('intercepted null')
            }
        }

        const applications = {}
        console.log('here')
        applications.first = new Application(destructible, source, 'island', 'first', { value: 1 })

        await applications.first.conference.ready

        const racer = new Application(destructible, source, 'racer', 'racer', {})

        await racer.conference.ready

        // Here we test backlogs. Both arriving and accepting a backlogged count
        // down and leaving and removing a participant from a backlog.

        applications.second = new Application(destructible, source, 'island', 'second', { value: 2 })
        assert(await applications.second.conference.ready)
        const received = applications.second.envelopes.join(event => {
            console.log(require('util').inspect(event, { depth: null }))
            return event.method == 'receive'
        })
        applications.second.conference.enqueue('name', { value: 1 })

        applications.third = new Application(destructible, source, 'island', 'third', { value: 3 })
        await applications.third.conference.ready

        await received

        applications.second.unblock.call()

        colleague.terminate('island', 'second')

        const reduced = await applications.third.envelopes.join(event => {
            return (event.body || event.entry || event.government).promise == '6/0'
        })

        okay({
            majority: reduced.government.majority,
            constituents: reduced.government.constituents
        }, {
            majority: [ 'first' ],
            constituents: [ 'third' ]
        }, 'enqueue')

        destructible.destroy()

        console.log('destroying')
    })

    console.log('AWAITING PROMISE')
    await destructible.promise
    console.log('PROMISE AWAITED')

    okay('ran')
}
