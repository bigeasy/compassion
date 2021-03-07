require('proof')(3, async okay => {
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
                log: network.denizens[0].shifters.log.shifter().async,
                broadcasts: null,
                snapshot: null,
                consumer: {
                    events: 0,
                    async bootstrap () {
                        okay('bootstrapped')
                    },
                    async consume (event) {
                        switch (this.events++) {
                        case 0:
                            okay(event.body, 1, 'obtained')
                            break
                        case 1:
                            okay(event.arrayed[0].value, 'reduced')
                            break
                        }
                        return true
                    },
                    async snapshot (queue) {
                    }
                }
            })
        })

        confederates[confederates.length - 1].messages = confederates[confederates.length - 1].conference.messages.shifter().sync

        confederates[0].conference.enqueue(1)

        let message = confederates[0].messages.shift()

        network.denizens[0].enqueue(network.time, message.republic, message.body)

        network.send()

        // TODO Figure out how to drain. Shifter, join, right?
        await new Promise(resolve => setTimeout(resolve, 150))

        message = confederates[0].messages.shift()

        network.denizens[0].enqueue(network.time, message.republic, message.body)

        network.send()

        console.log(message)

        destructible.destroy()
    })

    await destructible.promise
})
