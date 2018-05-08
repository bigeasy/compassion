var coalesce = require('extant')
var cadence = require('cadence')
var delta = require('delta')

module.exports = function (options) {
    options.events.push({
        type: 'backlog',
        id: options.id,
        body: coalesce(options.headers['content-type'], 'application/octet-stream')
    })
    switch (options.headers['content-type']) {
    case 'application/json':
        return cadence(function (async, response) {
            async(function () {
                delta(async()).ee(options.stream).on('data', []).on('end')
            }, function (data) {
                var buffer = Buffer.concat(data)
                options.events.push({
                    type: 'body',
                    id: options.id,
                    body: JSON.parse(buffer.toString('utf8'))
                })
                response.end(buffer)
            })
        })
    case 'application/json-stream':
        return cadence(function (async, response) {
            var reader = new Staccato.Readable(byline(response))
            var loop = async(function () {
                reader.read(async())
            }, function (line) {
                if (line == null) {
                    events.push({ type: 'body', id: options.id, body: null })
                    response.end()
                    return [ loop.break ]
                } else {
                    response.write(line)
                    events.push({
                        type: 'body',
                        id: options.id,
                        body: JSON.parse(line.toString('utf8'))
                    })
                }
            })()
        })
    default:
        return cadence(function (async, response) {
            var reader = new Staccato.Readable(byline(response))
            var loop = async(function () {
                reader.read(async())
            }, function (line) {
                if (line == null) {
                    events.push({ type: 'body', id: options.id, body: null })
                    response.end()
                    return [ loop.break ]
                } else {
                    response.write(line)
                    // TODO Break up into 1024.
                    events.push({ type: 'body', id: options.id, body: line.toString('base64') })
                }
            })()
        })
    }
}
