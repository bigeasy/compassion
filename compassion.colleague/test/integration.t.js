require('proof')(1, async okay => {
    const Future = require('perhaps')
    const Destructible = require('destructible')
    const { Queue } = require('avenue')

    class KeyValueStore {
        constructor () {
            this._values = {}
            this.client = null
            this.events = new Queue
            this._future = Future.resolve(true)
        }

        initialize (client) {
            this.client = client
        }

        async bootstrap () {
            await this._future.promise
            this.events.push({ method: 'bootstrap' })
        }

        async arrive ({ arrival }) {
            await this._future.promise
            console.log(arrival)
            return true
        }

        async acclimated () {
            await this._future.promise
            this.events.push({ method: 'acclimated' })
            return true
        }

        async map ({ message }) {
            await this._future.promise
            invocations.push({ method: 'map', message })
            this._values[message.key] = message.value
            return true
        }

        async reduce ({ arrayed }) {
            await this._future.promise
            invocations.push({ method: 'reduce', arrayed })
        }

        pause (future) {
            this._future = future
        }

        set (key, value) {
            conference.enqueue({ key, value })
        }

        get (key) {
            return this._values[key]
        }
    }

    const destructible = new Destructible('test/integration.t.js')
    const Compassion = require('../redux')

    destructible.ephemeral('test', async () => {
        const islanders = []
        const kv = new KeyValueStore
        const shifter = kv.events.shifter()
        const address = await Compassion.listen(destructible.durable('compassion'), {
            census: {
                async population (island) {
                    return islanders
                }
            },
            applications: { kv },
            bind: { host: '127.0.0.1', port: 0 }
        })
        islanders.push(`http://127.0.0.1:${address.port}`)

        okay(await shifter.join(entry => entry.method == 'acclimated'), { method: 'acclimated' }, 'acclimated')

        destructible.destroy()
    })

    await destructible.promise
})
