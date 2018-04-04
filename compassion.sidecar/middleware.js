function Middleware () {
}

Middleware.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Compassion API\n' ]
})

Middleware.prototype.register = cadence(function (async) {
    // If we already have one and it doesn't match, then we destroy this one.
    // Create a new instance.
    async(function () {
    }, function () {
    })
})

module.exports = Middleware
