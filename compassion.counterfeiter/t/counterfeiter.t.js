require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Counterfeiter = require('..')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/counterfeiter.t.js')
    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('counterfeiter', Counterfeiter, {}, async())
    }, function (counterfeiter) {
        okay(counterfeiter, 'created')
    })
}
