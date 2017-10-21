require('proof')(5, require('cadence')(prove))

function prove (async, assert) {
    var Kibitzer = require('kibitz')

    var UserAgent = require('vizsla')

    var Chaperon = require('../chaperon')
    assert(Chaperon, 'require')

    var chaperon = new Chaperon({
        kibitzer: new Kibitzer({ id: 'x' }),
        colleague: {
            getProperties: function (callback) { callback(null, {}) }
        }
    })

    async(function () {
        chaperon._action({ name: 'unstable' }, 1, async())
    }, function () {
        chaperon._action({ name: 'recoverable' }, 1, async())
    }, function () {
        chaperon._action({ name: 'bootstrap', url: { self: 'x' } }, 1, async())
    }, function () {
        chaperon._action({ name: 'splitBrain' }, null, async())
    }, function () {
        assert(chaperon.destroyed, 'self-destruct')
        chaperon.destroy()
        chaperon = new Chaperon({
            kibitzer: {
                join: function (leader, properties, callback) {
                    assert({
                        leader: leader,
                        properties: properties
                    }, {
                        leader: { url: 'y', republic: 1 },
                        properties: { url: 'x' }
                    }, 'joining')
                    callback(null, true)
                }
            },
            colleague: {
                getProperties: function (callback) { callback(null, {}) }
            }
        })
        chaperon._action({
            name: 'join',
            url: {
                self: 'x',
                leader: 'y'
            },
            republic: 1
        }, 1, async())
    }, function () {
        chaperon.destroy()
        chaperon = new Chaperon({
            kibitzer: {
                join: function (leader, properties, callback) {
                    assert({
                        leader: leader,
                        properties: properties
                    }, {
                        leader: { url: 'y', republic: 1 },
                        properties: { url: 'x' }
                    }, 'joining')
                    callback(null, false)
                }
            },
            colleague: {
                getProperties: function (callback) { callback(null, {}) }
            }
        })
        chaperon._action({
            name: 'join',
            url: {
                self: 'x',
                leader: 'y'
            },
            republic: 1
         }, 1, async())
    }, function () {
        var actions = [{
            statusCode: 500,
            headers: {},
            body: new Buffer('')
        }, {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: new Buffer(JSON.stringify({ name: 'unrecoverable' }))
        }]
        var ua = new UserAgent(function (request, response) {
            var action = actions.shift()
            response.writeHead(action.statusCode, action.headers)
            response.end(action.body)
        })
        chaperon = new Chaperon({
            chaperon: 'http://127.0.0.1:8080',
            ua: ua,
            kibitzer: { paxos: {}, destroy: function () {} }
        })
        chaperon.listen(async())
    }, function () {
        assert(chaperon.destroyed, 'polled unrecoverable')
        var ua = new UserAgent(function (request, response) {
            response.writeHead(200)
            response.end(new Buffer(''))
        })
        chaperon = new Chaperon({
            chaperon: 'http://127.0.0.1:8080',
            ua: ua,
            kibitzer: { paxos: {}, destroy: function () {} }
        })
        chaperon.listen(async())
        chaperon.destroy()
    })
}
