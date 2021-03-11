require('proof')(1, async okay => {
    const compassion = new Compassion(8088)

    const envelopes = []
    compassion.mount('island', {
        dispatch: async function (envelope, shifter) {
            switch (envelope.method) {
            case 'bootstrap':
                break
            case 'join':
                assert.equal(await shifter.shift(), 1)
                assert.equal(await shifter.shift(), null)
                break
            case 'arrive':
                if (envelope.entry.arrive.id == envelope.self.id) {
                    setImmediate(this._arrived)
                }
                break
            case 'receive':
                if (envelope.self.id == 'second') {
                    await this._blocker
                    this._blocker = new Promise(resolve => this.unblock = resolve)
                }
                return { from: envelope.self.id }
            case 'reduce':
                break
            case 'depart':
                console.log('--- application depart ---')
                break
            }
        },
        snapshot: async function (promise, queue) {
            await queue.enqueue([ 1, null ])
        }
    })

    await compassion.listen()

    compassion.enqueue('island', { message: 1 })
})
