// [![Actions Status](https://github.com/bigeasy/compassion/workflows/Node%20CI/badge.svg)](https://github.com/bigeasy/compassion/actions)
// [![codecov](https://codecov.io/gh/bigeasy/compassion/branch/master/graph/badge.svg)](https://codecov.io/gh/bigeasy/compassion)
// [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
//
// Paxos based consensus framework.
//
// | What          | Where                                             |
// | --- | --- |
// | Discussion    | https://github.com/bigeasy/compassion/issues/1    |
// | Documentation | https://bigeasy.github.io/compassion              |
// | Source        | https://github.com/bigeasy/compassion             |
// | Issues        | https://github.com/bigeasy/compassion/issues      |
// | CI            | https://travis-ci.org/bigeasy/compassion          |
// | Coverage:     | https://codecov.io/gh/bigeasy/compassion          |
// | License:      | MIT                                               |
//
//
// Compassion installs from NPM.

// ## Living `README.md`
//
// This `README.md` is also a unit test using the
// [Proof](https://github.com/bigeasy/proof) unit test framework. We'll use the
// Proof `okay` function to assert out statements in the readme. A Proof unit test
// generally looks like this.

require('proof')(1, async okay => {
    // ## Overview

    const Compassion = require('..')

    const Destructible = require('destructible')
    const { Queue } = require('avenue')

    class KeyValueStore {
        constructor () {
            this.ready = new Promise(resolve => this.arrived = resolve)
            this.cookie = 0
            this.snapshots = {}
            this.resolutions = {}
            this.compassion = null
            this.store = null
        }

        initialize (compassion) {
            this.compassion = compassion
        }

        async bootstrap ({ self }) {
            this.promise = self.arrived
            this.store = {}
        }

        async snapshot ({ promise, queue }) {
            queue.push(this.snapshots[promise])
        }

        async join ({ self, shifter }) {
            this.promise = self.arrived
            this.store = await shifter.shift()
        }

        async arrive ({ arrival }) {
            this.arrived.call()
            this.snapshots[arrival.promise] = JSON.parse(JSON.stringify(this.store))
        }

        async acclimated ({ promise }) {
            this.snapshots[promise]
        }

        async entry ({ entry }) {
            this.store[entry.key] = entry.value
            const resolution = this.resolutions[entry.cookie]
            if (resolution != null) {
                delete this.resolutions[entry.cookie]
                resolution.call(null)
            }
        }

        async depart ({ promise }) {
            this.snapshots[promise]
        }

        set (key, value) {
            return new Promise(resolve => {
                const cookie = `${this.promise}?${this.cookie++}`
                this.resolutions[cookie] = resolve
                this.compassion.enqueue({ cookie, key, value })
            })
        }

        get (key) {
            return this.store[key]
        }
    }

    {
        const destructible = new Destructible('compassion')

        // Construct a census. Usually you'll use Mingle, but we'll create a dummy census
        // and fake the service discovery. We have to be sure to terminate the queue on
        // shutdown, so we register a destruct handler.

        const census = new Queue
        destructible.destruct(() => census.push(null))

        const kv = new KeyValueStore
        const { address, port } = await Compassion.listen(destructible, {
            census: census.shifter(),
            applications: { kv },
            bind: { host: '127.0.0.1', port: 0 }
        })

        census.push([ `http://${address}:${port}` ])

        await kv.ready
        await kv.set('x', 1)
        okay(kv.get('x'), 1, 'set and get')

        destructible.destroy()

        await destructible.promise
    }
})

// You can run this unit test yourself to see the output from the various
// code sections of the readme.

// What do we need to discuss? Simple outline. Be sure to link to people to
// [Conference](https://github.com/bigeasy/conference). Uh, oh. I also have to
// document [Mingle](https://github.com/bigeasy/mingle).
//
// ## Initialize
//
// ## Bootstrap
//
// ## Join and Snapshot
//
// ## Arrive
//
// ## Acclimated
//
// ## Entry
//
// ## Depart
