module.exports = function (Conference) {
    const assert = require('assert')

    async function splice (splicer, conference) {
        for await (const entries of splicer.splice(16)) {
            for (const entry of entries) {
                conference.entry(entry)
            }
        }
    }

    return async function (destructible, olio, island, id, properties = {}) {
        assert(typeof options.island == 'string', 'a string id is required')
        assert(typeof options.id == 'string', 'a string id is required')
        const conduit = (await olio.sender('compassion')).processes[0].conduit
        const { queue, splicer } = conduit.request({ island, id, properties })
        const conference = new Conference(conduit, queue, application, false)
        destructible.durable('splicer', splice(splicer, conference))
        destructible.destruct(() => splicer.destroy())
    }
}
