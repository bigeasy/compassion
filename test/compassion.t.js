require('proof')(6, async okay => {
    const { Future } = require('perhaps')
    const Destructible = require('destructible')
    const { Queue } = require('avenue')

    let instance = 0
    class KeyValueStore {
        constructor () {
            this._values = {}
            this._instance = instance++
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

        async snapshot ({ queue, promise }) {
            queue.push(this._snapshots[promise])
            queue.push(null)
        }

        async join ({ snapshot }) {
            this._values = await snapshot.shift()
            await snapshot.shift()
        }

        async arrive ({ arrival }) {
            await this._future.promise
            this._snapshots[arrival.promise] = JSON.parse(JSON.stringify(this._values))
            return true
        }

        async acclimated ({ promise }) {
            await this._future.promise
            this.events.push({ method: 'acclimated' })
            delete this._snapshots[promise]
            return true
        }

        async entry ({ request }) {
            await this._future.promise
            this.events.push({ method: 'entry', request })
            this._values[request.key] = request.value
        }

        async depart (message) {
            this.events.push({ method: 'depart' })
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
    const Compassion = require('..')

    class Participant {
        static count = 0

        constructor (destructible, kv, { address, port }) {
            this.kv = kv
            this.shifter = kv.events.shifter()
            this.url = `http://127.0.0.1:${port}`
            this.destructible = destructible
        }

        static async create (census) {
            const kv = new KeyValueStore
            const subDestructible = destructible.ephemeral(`compassion.${Participant.count++}`)
            subDestructible.destruct(() => census.destroy())
            const address = await Compassion.listen(subDestructible, {
                census: census,
                applications: { kv },
                bind: { host: '127.0.0.1', port: 0 }
            })
            return new Participant(subDestructible, kv, address)
        }
    }

    destructible.ephemeral('test', async () => {
        const census = new Queue()
        const participants = []
        participants.push(await Participant.create(census.shifter()))

        // The timeout is just to ensure we test a missing endpoint.
        census.push([ participants[0].url + '/missing/' ])
        await new Promise(resolve => setTimeout(resolve, 500))

        // Now we actually join.
        census.push([ participants[0].url ])
        okay(await participants[0].shifter.join(entry => entry.method == 'acclimated'), { method: 'acclimated' }, 'acclimated')

        participants[0].kv.set('x', 1)

        okay(await participants[0].shifter.join(entry => entry.method == 'entry'), {
            method: 'entry',
            request:{ key: 'x', value: 1 }
        }, 'reduce')

        okay(participants[0].kv.get('x'), 1, 'set')

        participants.push(await Participant.create(census.shifter()))
        census.push(participants.map(participant => participant.url))

        okay(await participants[0].shifter.join(entry => {
            console.log(entry)
            return entry.method == 'acclimated'
        }), { method: 'acclimated' }, 'acclimated')

        participants.push(await Participant.create(census.shifter()))
        census.push(participants.map(participant => participant.url))

        okay(await participants[0].shifter.join(entry => {
            console.log(entry)
            return entry.method == 'acclimated'
        }), { method: 'acclimated' }, 'acclimated')

        participants[2].destructible.destroy()
        participants.pop()
        census.push(participants.map(participant => participant.url))

        okay(await participants[0].shifter.join(entry => {
            return entry.method == 'depart'
        }), { method: 'depart' }, 'departed')

        census.push(null)
        destructible.destroy()
    })

    await destructible.promise
    console.log('done')
})
