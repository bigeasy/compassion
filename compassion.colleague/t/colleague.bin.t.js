require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('..'), io
    var Mock = require('olio/mock')
    var Procedure = require('conduit/procedure')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/mock')
    var UserAgent = require('vizsla')
    var ua = new UserAgent
    async([function  () {
        destructible.completed.wait(async())
    }, function (error) {
        console.log(error.stack)
        throw error
    }])
    async([function () {
        destructible.destroy()
    }], function () {
        io = bin([ '--local', 8386, '--network', 8486, '--discovery', 'mingle' ], {}, async())
        var mock = new Mock(io)
        async(function () {
            mock.ready.wait(async())
        }, function () {
            mock.initialize('colleague', 0)
            mock.sibling('mingle', 1, function (destructible, index, count, callback) {
                destructible.monitor('procedure', Procedure, function () {}, callback)
            })
            console.log('ready')
        })
        async(function () {
            io.ready.wait(async())
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8486/',
                parse: 'text',
                timeout: 1000
            }, async())
        }, function (body) {
            okay(body, 'Compassion Networked API\n', 'network interface')
            ua.fetch({
                url: 'http://127.0.0.1:8386/',
                parse: 'text',
                timeout: 1000
            }, async())
        }, function (body) {
            okay(body, 'Compassion Local API\n', 'local interface')
            io.emit('SIGTERM')
        })
    })
}
