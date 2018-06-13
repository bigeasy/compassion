require('proof')(5, require('cadence')(prove))

function prove (async, okay) {
    var Conference = require('../../compassion.conference/conference')
    var Staccato = require('staccato')
    var fs = require('fs')
    var path = require('path')
    var Replay = require('../replay')
    var Vizsla = require('vizsla')
    var Destructible = require('destructible')
    var Application = require('../../compassion.colleague/t/application')

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

    var ua = new Vizsla
    async([function () {
        destructible.destroy()
    }], function () {
        var input = fs.createReadStream(path.join(__dirname, '..', '..', 'compassion.colleague', 't', 'entries.jsons'))
        var readable = new Staccato.Readable(byline(input))
        destructible.monitor('replay', Replay, {
            Conference: Conference,
            readable: readable,
            id: 'third',
            bind: {
                listen: function (server, callback) {
                    server.listen(8386, '127.0.0.1', callback)
                }
            }
        }, async())
    }, function () {
        ua.fetch({
            url:  'http://127.0.0.1:8386/',
            raise: true,
            parse: 'text'
        }, async())
    }, function (body) {
        okay(body, 'Compassion Replay API\n', 'index')
        var application = new Application('third', okay)
        applications.push(application)
        application.blocker.unlatch()
        async(function () {
            var server = http.createServer(application.reactor.middleware)
            destroyer(server)
            destructible.destruct.wait(server, 'destroy')
            delta(destructible.monitor('third')).ee(server).on('close')
            server.listen(8088, '127.0.0.1', async())
        }, function () {
            application.register('http://127.0.0.1:8088/', async())
        }, function () {
            ua.fetch({
                url:  'http://127.0.0.1:8386/register',
                post: {}
            }, async())
        }, function (body, response) {
            okay(response.statusCode, 401, 'already registered')
            destructible.destruct.wait(application.arrived, 'unlatch')
            application.arrived.wait(async())
        })
    }, function () {
        setTimeout(async(), 250)
    })
}
