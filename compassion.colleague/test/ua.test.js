require('proof')(4, async (okay) => {
    const fastify = require('fastify')({})

    const ua = require('../ua')
    const test = []

    fastify.post('/error', {}, async (request, reply) => {
        test.push(request.body)
        reply.code(404)
        return "not found"
    })

    await fastify.listen(0)

    const url = require('url')
    const axios = require('axios')

    const location = `http://127.0.0.1:${fastify.server.address().port}`
    try {
        const json = await ua.json(location, '/error', { json: true })
        okay(json, null, 'json errors')
        const http = await ua.stream(location, '/error', { stream: true })
        okay(http.read(), null, 'stream http error')
        const socket = await ua.stream('http://127.0.0.1:9999', '/error', { stream: true })
        okay(socket.read(), null, 'stream socket error')
        okay(test, [{ json: true }, { stream: true }], 'posted')
    } finally {
        await fastify.close()
    }
})
