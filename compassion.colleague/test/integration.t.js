require('proof')(3, async okay => {
    const Future = require('perhaps')
    const Destructible = require('destructible')
    const { Queue } = require('avenue')

    class KeyValueStore {
        constructor () {
            this._values = {}
            this.client = null
            this.events = new Queue
            this._future = Future.resolve(true)
            this._snapshots = {}
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
            this._snapshots[arrival.promise] = JSON.stringify(this._values)
            return true
        }

        async acclimated ({ promise }) {
            await this._future.promise
            this.events.push({ method: 'acclimated' })
            delete this._snapshots[promise]
            return true
        }

        async map ({ body }) {
            await this._future.promise
            this.events.push({ method: 'map', body })
            console.log('body', body)
            this._values[body.key] = body.value
            return true
        }

        async reduce ({ arrayed }) {
            await this._future.promise
            this.events.push({ method: 'reduce', arrayed })
        }

        pause (future) {
            this._future = future
        }

        set (key, value) {
            this.client.enqueue({ key, value })
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

        kv.set('x', 1)

        okay(await shifter.join(entry => entry.method == 'reduce'), {
            method: 'reduce',
            arrayed: [{ promise: '1/0', id: `${address.address}:${address.port}`, value: true }]
        }, 'reduce')

        okay(kv.get('x'), 1, 'set')

        destructible.destroy()
    })

    await destructible.promise
})
