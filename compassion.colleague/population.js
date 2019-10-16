const url = require('url')
const logger = require('prolific.logger').create('compassion.colleague')
const ua = require('./ua')
const paht = require('path')

class Population {
    constructor (resolver) {
        this._resolver = resolver
    }

    // We don't use `id` here, but we added it so we can use it in testing to get
    // test coverage of the race conidtion where the colleague is destroyed while
    // we're fetching the population.
    async census (island) {
        const islanders = []
        for (const location of (await this._resolver.resolve())) {
            console.log(location)
            const data = await ua.json(location, `/island/${island}/islanders`)
            if (data == null) {
                islanders.push(null)
            } else {
                for (const islander of data) {
                    islanders.push({
                        id: islander.id,
                        government: islander.government,
                        cookie: islander.cookie,
                        url: url.resolve(location, `/island/${island}/islander/${islander.id}/`),
                        createdAt: islander.createdAt
                    })
                }
            }
        }
        return islanders
    }
}

module.exports = Population
