require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Middleware = require('../middleware')
    okay(Middleware, 'require')
}
