const axios = require('axios')
const url = require('url')
const logger = require('prolific.logger').create('compassion.colleague')

class Population {
    constructor (resolver) {
        this._resolver = resolver
    }

    // We don't use `id` here, but we added it so we can use it in testing to get
    // test coverage of the race conidtion where the colleague is destroyed while
    // we're fetching the population.
    async census (island, id) {
        const islanders = []
        let complete = true
        for (const location of (await this._resolver.resolve())) {
            try {
                const path = url.resolve(location, `./island/${island}/islanders`)
                const response = await axios.get(path)
                for (const islander of response.data) {
                    islanders.push({
                        id: islander.id,
                        government: islander.government,
                        cookie: islander.cookie,
                        url: url.resolve(path, `${islander.id}/`),
                        createdAt: islander.createdAt
                    })
                }
            } catch (error) {
                logger.error('population', { stack: error.stack })
                complete = false
            }
        }
        return { islanders, complete }
    }
}

module.exports = Population
