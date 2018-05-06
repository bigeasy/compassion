require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var Staccato = require('staccato')
    var fs = require('fs')
    var path = require('path')
    var Replay = require('../replay')
    var Vizsla = require('vizsla')
    var stringify = require('vizsla/stringify')
    var raiseify = require('vizsla/raiseify')
    var Destructible = require('destructible')
    var Application = require('./application')

    var destructible = new Destructible('t/replay.t.js')
    var applications = []
    var http = require('http')
    var destroyer = require('server-destroy')
    var delta = require('delta')

    var byline = require('byline')

    async([function () {
        destructible.completed.wait(async())
    }, function (error) {
        console.log(error.stack)
        throw error
    }])

    async([function () {
        destructible.destroy()
    }], function () {
        var input = fs.createReadStream(path.join(__dirname, 'entries.jsons'))
        var readable = new Staccato.Readable(byline(input))
        destructible.monitor('replay', Replay, {
            readable: readable,
            id: 'first',
            bind: {
                listen: function (server, callback) {
                    server.listen(8386, '127.0.0.1', callback)
                }
            }
        }, async())
    }, function () {
        var ua = new Vizsla
        ua.fetch({
            url:  'http://127.0.0.1:8386/',
            parse: [ stringify() ]
        }, async())
    }, function (body) {
        okay(body, 'Compassion Replay API\n', 'index')
        var application = new Application('first', okay)
        applications.push(application)
        async(function () {
            var server = http.createServer(application.reactor.middleware)
            destroyer(server)
            destructible.destruct.wait(server, 'destroy')
            delta(destructible.monitor('first')).ee(server).on('close')
            server.listen(8088, '127.0.0.1', async())
        }, function () {
            application.register('http://127.0.0.1:8088/', async())
        }, function () {
            destructible.destruct.wait(application.arrived, 'unlatch')
            application.arrived.wait(async())
        })
    }, function () {
        setTimeout(async(), 5000)
    })
}
