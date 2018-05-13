require('proof')(7, require('cadence')(prove))

function prove (async, okay) {
    var Procession = require('procession')
    var backlogger = require('../backlogger')
    var stream = require('stream')
    async(function () {
        var events = new Procession
        var shifter = events.shifter()
        var input = new stream.PassThrough
        var f = backlogger({
            events: events,
            id: 'first',
            contentType: 'application/json',
            input: input
        })
        var output = new stream.PassThrough
        async(function () {
            f(output, async())
            input.end(JSON.stringify({ a: 1 }) + '\n')
        }, function () {
            okay(output.read().toString(), '{"a":1}\n', 'json output')
            okay([
                shifter.shift(),
                shifter.shift(),
                shifter.shift()
            ], [
                {
                    type: 'backlog',
                    id: 'first',
                    body: 'application/json'
                }, {
                    type: 'body',
                    id: 'first',
                    body: { a: 1 }
                },
                null
            ], 'json events')
        })
    }, function () {
        var events = new Procession
        var shifter = events.shifter()
        var input = new stream.PassThrough
        var f = backlogger({
            events: events,
            id: 'first',
            contentType: 'application/json-stream',
            input: input
        })
        var output = new stream.PassThrough
        async(function () {
            f(output, async())
            input.end(JSON.stringify({ a: 1 }) + '\n')
        }, function () {
            okay(output.read().toString(), '{"a":1}\n', 'streaming json output')
            okay([
                shifter.shift(),
                shifter.shift(),
                shifter.shift(),
                shifter.shift()
            ], [
                {
                    type: 'backlog',
                    id: 'first',
                    body: 'application/json-stream'
                }, {
                    type: 'body',
                    id: 'first',
                    body: { a: 1 }
                }, {
                    type: 'body',
                    id: 'first',
                    body: null
                },
                null
            ], 'streaming json events')
        })
    }, function () {
        var events = new Procession
        var shifter = events.shifter()
        var input = new stream.PassThrough
        var f = backlogger({
            events: events,
            id: 'first',
            chunkSize: 24,
            input: input
        })
        var output = new stream.PassThrough
        var alphabet = 'abcdefghijklmnopqrstuvwxyz'
        async(function () {
            f(output, async())
            input.end(alphabet)
        }, function () {
            okay(output.read().toString(), alphabet, 'streaming octet output')
            var shifty = [
                shifter.shift(),
                shifter.shift(),
                shifter.shift(),
                shifter.shift(),
                shifter.shift()
            ]
            var buffer = Buffer.concat([
                Buffer.from(shifty[1].body, 'base64'),
                Buffer.from(shifty[2].body, 'base64')
            ])
            okay(buffer.toString(), alphabet, 'streaming octet catenated')
            okay(shifty, [
                {
                    type: 'backlog',
                    id: 'first',
                    body: 'application/octet-stream'
                }, {
                    type: 'body',
                    id: 'first',
                    body: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4'
                }, {
                    type: 'body',
                    id: 'first',
                    body: 'eXo='
                }, {
                    type: 'body',
                    id: 'first',
                    body: null
                },
                null
            ], 'streaming json events')
        })
    })
}
