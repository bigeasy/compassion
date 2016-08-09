require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var Vizsla = require('vizsla')
    var ua = new Vizsla
    var abend = require('abend')
    var conduit = require('compassion.conduit/conduit.bin'), program
    async(function () {
        program = conduit([ '--bind', '127.0.0.1:8888' ], {}, async())
    }, function () {
        var Listener = require('../listener')
        var listener = new Listener({
            request: function (message, callback) {
                assert(message, { key: 'value' }, 'requested')
                callback(null, { called: true })
            }
        })
        async(function () {
            listener.listen('127.0.0.1:8888', { key: 'x' }, abend)
            listener.listening.enter(async())
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8888/kibitz',
                raise: true,
                post: { key: 'x', post: { key: 'value' } }
            }, async())
        }, function (body) {
            assert(body.called, 'called')
            listener.stop()
            listener.stop()
        })
    }, function () {
        program.emit('SIGINT')
    })
}
