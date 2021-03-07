require('proof')(1, async okay => {
    const Conference = require('../conference')

    const { Queue } = require('avenue')
    const Destructible = require('destructible')

    const Network = require('./network')


    const destructible = new Destructible('t/conference.t.js')

    destructible.ephemeral('test', async () => {
        const network = new Network

        const confederates = []

        network.bootstrap()

        const entry = network.denizens[0].shifters.log.shift()

        confederates.push({
            conference: new Conference(destructible.durable('conference.0'), {
                id: '0',
                entry: entry,
                log: network.denizens[0].shifters.log,
                broadcasts: null,
                snapshot: null,
                consumer: {
                    async bootstrap () {
                        okay('bootstrapped')
                    },
                    async consume (event) {
                    },
                    async snapshot (queue) {
                    }
                }
            })
        })

        confederates[confederates.length - 1].messages = confederates[confederates.length - 1].conference.messages.shifter().sync

        confederates[0].conference.enqueue(1)

        const message = confederates[0].messages.shift()

        network.denizens[0].enqueue(network.time, message.republic, message.body)

        network.send()

        console.log(network.denizens[0].shifters.log.shift())

        console.log(message)

        destructible.destroy()
    })

    await destructible.promise
})
