require('proof')(9, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')
    var Middleware = require('../middleware')
    var middleware = new Middleware(0, 'island', {
        kibitzer: {
            paxos: { id: 'x', republic: 0, government: { promise: '1/0' } }
        },
        properties: {},
        bootstrap: cadence(function (async, republic, url) {
            okay({
                republic: republic,
                url: url
            }, {
                republic: 2,
                url: 'http://127.0.0.1:8486/1/'
            }, 'bootstrap')
        })
    })
    async(function () {
        middleware.index(async())
    }, function (statusCode, headers, body) {
        okay(body, 'Compassion Colleague API\n', 'index')
        middleware.health(async())
    }, function (response) {
        okay(response, {
            dispatcher: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            startedAt: 0,
            island: 'island',
            id: 'x',
            republic: 0,
            rejoining: null,
            government: { promise: '1/0' }
        }, 'health')
        middleware.bootstrap({
            body: {
                url: { self: 'http://127.0.0.1:8486/1/' },
                republic: 2
            }
        }, async())
    }, function (response) {
        okay(response, 200, 'bootstrapped')
    }, [function () {
        middleware.bootstrap({
            body: {
                url: { self: 'http://127.0.0.1:8486/1/' },
                republic: 2
            }
        }, async())
    }, function (error) {
        okay(error, 401, 'already decided')
    }], function () {
        middleware = new Middleware(0, 'island', {
            join: cadence(function (async, republic, leader, url) {
                okay({
                    republic: republic,
                    leader: leader,
                    url: url
                }, {
                    republic: 2,
                    leader: 'http://127.0.0.1:8486/1/',
                    url: 'http://127.0.0.1:8486/2/'
                }, 'join')
            })
        }, function () {
            okay(true, 'terminated')
        })
        middleware.join({
            body: {
                url: {
                    self: 'http://127.0.0.1:8486/2/',
                    leader: 'http://127.0.0.1:8486/1/'
                },
                republic: 2
            }
        }, async())
    }, function (response) {
        okay(response, 200, 'joined')
        middleware.terminate(async())
    }, function (response) {
        okay(response, 200, 'joined')
    })
}
