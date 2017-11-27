require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var Middleware = require('../middleware')
    var middleware = new Middleware(0, 'island', {
        paxos: { id: 'x', republic: 0, government: { promise: '1/0' } }
    }, {})
    async(function () {
        middleware.index(async())
    }, function (statusCode, headers, body) {
        assert(body, 'Compassion Colleague API\n', 'index')
        middleware.health(async())
    }, function (response) {
        assert(response, {
            dispatcher: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            startedAt: 0,
            island: 'island',
            id: 'x',
            republic: 0,
            government: { promise: '1/0' }
        }, 'health')
    })
}
