var cadence = require('cadence')

module.exports = cadence(function (async, advance) {
    async(function () {
        advance('backlog', async())
    }, function (envelope) {
        switch (envelope.body) {
        case 'application/json':
            async(function () {
                advance('body', async())
            }, function (body) {
                return body.body
            })
            break
        case 'application/json-stream':
            return cadence(function (async, response) {
                var loop = async(function () {
                    advance('body', async())
                }, function (body) {
                    if (body.body == null) {
                        response.end()
                        return [ loop.break ]
                    } else {
                        response.write(JSON.stringify(body.body) + '\n', async())
                    }
                })()
            })
        }
    })
})
