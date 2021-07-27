require('proof')(4, async okay => {
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

        async arrive ({ self: { id }, arrival }) {
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

        async map ({ self, government, body }) {
            switch (body.method) {
            case 'put': {
                    await this._future.promise
                    this.events.push({ method: 'map', body })
                    this._values[body.key] = body.value
                    return true
                }
                break
            case 'leader': {
                    if (self.id == government.majority[0]) {
                        return true
                    }
                }
                break
            case 'map': {
                    return self.arrived
                }
                break
            }
        }

        async reduce ({ arrayed }) {
            await this._future.promise
            this.events.push({ method: 'reduce', arrayed })
        }

        pause (future) {
            this._future = future
        }

        set (key, value) {
            this.client.enqueue({ method: 'put', key, value })
        }

        get (key) {
            return this._values[key]
        }
    }

    const destructible = new Destructible('test/integration.t.js')
    const Compassion = require('..')

    class Participant {
        constructor (kv, { address, port }) {
            this.kv = kv
            this.shifter = kv.events.shifter()
            this.url = `http://127.0.0.1:${port}`
        }

        static async create (census) {
            const kv = new KeyValueStore
            const address = await Compassion.listen(destructible.durable('compassion'), {
                census: census,
                applications: { kv },
                bind: { host: '127.0.0.1', port: 0 }
            })
            return new Participant(kv, address)
        }
    }

    destructible.ephemeral('test', async () => {
        const census = new Queue()
        const participants = []
        participants.push(await Participant.create(census.shifter()))
        census.push([ participants[0].url + '/missing/' ])
        await new Promise(resolve => setTimeout(resolve, 500))
        census.push([ participants[0].url ])

        okay(await participants[0].shifter.join(entry => entry.method == 'acclimated'), { method: 'acclimated' }, 'acclimated')

        participants[0].kv.set('x', 1)

        okay(await participants[0].shifter.join(entry => entry.method == 'reduce'), {
            method: 'reduce',
            arrayed: [{ promise: '1/0', id: participants[0].kv.client.id, value: true }]
        }, 'reduce')

        okay(participants[0].kv.get('x'), 1, 'set')

        participants.push(await Participant.create(census.shifter()))
        census.push([ participants[0].url, participants[1].url ])

        okay(await participants[1].shifter.join(entry => {
            return entry.method == 'acclimated'
        }), { method: 'acclimated' }, 'acclimated')

        const leader = await participants[1].kv.client.call({ method: 'leader' })
        okay(leader.from, '1/0', 'call')

        const called = await participants[1].kv.client.call({ method: 'unknown' })
        okay(called, null, 'no answer')

        const mapped = await participants[1].kv.client.mapped({ method: 'map' })
        okay(mapped, { '1/0': '1/0', '2/0': '2/0' }, 'mapped')

        const arrayed = await participants[1].kv.client.arrayed({ method: 'map' })
        okay(arrayed.map(item => item.value), [ '1/0', '2/0' ], 'arrayed')

        /*
        const countdown = participants[1].kv.client.countdown('key')

        for (const participant of participants) {
            await participant.kv.client.call({ method: 'leader' }, 'key')
        }

        await countdown
        */

        census.push(null)
        destructible.destroy()
    })

    await destructible.promise
    console.log('done')
})
