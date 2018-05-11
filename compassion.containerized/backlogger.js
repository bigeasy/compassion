var coalesce = require('extant')
var cadence = require('cadence')
var delta = require('delta')
var Staccato = require('staccato')
var byline = require('byline')

module.exports = function (options) {
    var contentType = coalesce(options.contentType, 'application/octet-stream')
    options.events.push({ type: 'backlog', id: options.id, body: contentType })
    switch (contentType) {
    case 'application/json':
        return cadence(function (async, output) {
            async(function () {
                delta(async()).ee(options.input).on('data', []).on('end')
            }, function (data) {
                var buffer = Buffer.concat(data)
                options.events.push({
                    type: 'body',
                    id: options.id,
                    body: JSON.parse(buffer.toString('utf8'))
                })
                output.end(buffer)
            })
        })
    case 'application/json-stream':
        return cadence(function (async, output) {
            var reader = new Staccato.Readable(byline(options.input))
            var loop = async(function () {
                reader.read(async())
            }, function (line) {
                if (line == null) {
                    options.events.push({ type: 'body', id: options.id, body: null })
                    output.end()
                    return [ loop.break ]
                } else {
                    output.write(line)
                    output.write('\n')
                    options.events.push({
                        type: 'body',
                        id: options.id,
                        body: JSON.parse(line.toString('utf8'))
                    })
                }
            })()
        })
    default:
        return cadence(function (async, output) {
            var chunkSize = coalesce(options.chunkSize, 1024)
            var reader = new Staccato.Readable(options.input)
            var loop = async(function () {
                reader.read(async())
            }, function (buffer) {
                if (buffer == null) {
                    options.events.push({ type: 'body', id: options.id, body: null })
                    output.end()
                    return [ loop.break ]
                } else {
                    var length = buffer.length
                    for (var i = 0; i < buffer.length; i += chunkSize) {
                        options.events.push({
                            type: 'body',
                            id: options.id,
                            body: buffer.slice(i, i + chunkSize).toString('base64')
                        })
                    }
                    output.write(buffer)
                }
            })()
        })
    }
}
