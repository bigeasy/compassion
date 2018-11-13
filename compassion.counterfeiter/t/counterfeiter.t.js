require('proof')(1, prove)

function prove (okay, callback) {
    var Counterfeiter = require('..')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/counterfeiter.t.js')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('counterfeiter', Counterfeiter, {}, async())
        }, function (counterfeiter) {
            okay(counterfeiter, 'created')
        })
    })(destructible.monitor('test'))
}
