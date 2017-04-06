require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var Middleware = require('../middleware')
    var middleware = new Middleware({}, {})
    async(function () {
        middleware.index(async())
    }, function (response) {
        assert(response, 'Compassion Colleague API\n', 'index')
    })
}
