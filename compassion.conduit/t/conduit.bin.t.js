require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('../conduit.bin')
    var Vizsla = require('vizsla')
    var WebSocket = require('ws')
    var delta = require('delta')
    var ua = new Vizsla
    var program
    async(function () {
        program = bin([ '--bind', '127.0.0.1:8888' ], {}, async())
    }, function () {
        var ws = new WebSocket('ws://127.0.0.1:8888/?islandName=island&colleagueId=1')
        async(function () {
            delta(async()).ee(ws).on('open')
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8888/kibitz',
                post: {
                    islandName: 'island',
                    colleagueId: 1,
                    key: 'value'
                }
            }, async())
            async(function () {
                delta(async()).ee(ws).on('message')
            }, function (message) {
                var message = JSON.parse(message)
                ws.send(JSON.stringify({
                    cookie: message.cookie,
                    body: { hello: 'world' }
                }))
            })
        })
    }, function (response) {
        assert(response, { hello: 'world' }, 'post')
        assert(true, 'started')
        program.emit('SIGINT')
    })
}
