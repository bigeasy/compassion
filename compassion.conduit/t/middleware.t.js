require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var Conduit = require('../middleware')
    var conduit = new Conduit({ paths: [ '/island/1' ] })

    async(function () {
        conduit.index(async())
    }, function (statusCode, headers, body) {
        assert(body, 'Compassion Conduit API\n', 'index')
        conduit.health(async())
    }, function (health) {
        assert(health, {
            health: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            paths: [ '/island/1' ]
        }, 'health')
    })
}
