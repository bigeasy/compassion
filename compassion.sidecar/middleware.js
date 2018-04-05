var cadence = require('cadence')

var UserAgent = require('../compassion.colleague/ua')

function Middleware () {
}

Middleware.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion API\n' ]
})

Middleware.prototype.colleague = cadence(function (async, destructible, envelope) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, options.httpTimeout), 'request', async())
    }, function () {
    })
})

Middleware.prototype.register = cadence(function (async) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    destructible.monitor('colleague', true, this, 'colleague', request.body, async())
})

module.exports = Middleware
