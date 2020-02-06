const stream = require('stream')
const url = require('url')

const logger = require('prolific.logger').create('compassion.colleague')

const axios = require('axios')
const httpAdapter = require('axios/lib/adapters/http')

module.exports = {
    json: async (location, path, body) => {
        const resolved = url.resolve(location, path)
        try {
            if (body == null) {
                return (await axios.get(resolved)).data
            } else {
                return (await axios.post(resolved, body)).data
            }
        } catch (error) {
            logger.error('ua', { url: resolved, stack: error.stack })
            return null
        }
    },

    // See: // https://github.com/andrewstart/axios-streaming/blob/master/axios.js
    stream: async (location, path, body) => {
        const resolved = url.resolve(location, path)
        try {
            return (await axios.post(resolved, body, {
                responseType: 'stream',
                adapter: httpAdapter
            })).data
        } catch (error) {
            logger.error('ua', { url: resolved, stack: error.stack })
        }
        const empty = new stream.PassThrough
        empty.end()
        return empty
    }
}
