require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Sidecar = require('../sidecar')
    var Destructible = require('destructible')
    var destructible = new Destructible('t/compassion.t.js')
    okay(Sidecar, 'require')
    async(function () {
        destructible.monitor('sidecar', Sidecar, async())
    }, function () {
    })
}
