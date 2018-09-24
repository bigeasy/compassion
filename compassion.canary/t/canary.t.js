require('proof')(1, prove)

function prove (okay, callback) {
    var Canary = require('../canary')
    var canary = new Canary(function () {
        okay(true, 'done')
        callback()
    }, 250)
    canary.ping()
    canary.ping()
}
