require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var assert = require('assert')
    var backplayer = require('../backplayer')
    var stream = require('stream')
    function advance (entries) {
        return function (type, callback) {
            var entry = entries.shift()
            assert(entry.type == type)
            callback(null, entry)
        }
    }
    async(function () {
        backplayer(advance([{
            type: 'snapshot',
            id: 'first',
            body: 'application/json'
        }, {
            type: 'body',
            id: 'first',
            body: { a: 1 }
        }]), async())
    }, function (body) {
        okay(body, { a: 1 }, 'json')
        backplayer(advance([{
            type: 'snapshot',
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
        }]), async())
    }, function (f) {
        var output = new stream.PassThrough
        async(function () {
            f(output, async())
        }, function () {
            okay(output.read().toString(), '{"a":1}\n', 'json stream')
        })
    }, function () {
        backplayer(advance([{
            type: 'snapshot',
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
        }]), async())
    }, function (f) {
        var output = new stream.PassThrough
        async(function () {
            f(output, async())
        }, function () {
            okay(output.read().toString(), 'abcdefghijklmnopqrstuvwxyz', 'octet stream')
        })
    })
}
