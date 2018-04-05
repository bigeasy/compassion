require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Counterfeiter = require('../counterfeiter')
    var Destructible = require('destructible')
    okay(Counterfeiter, 'require')
    async(function () {
    }, function () {
    })
}
