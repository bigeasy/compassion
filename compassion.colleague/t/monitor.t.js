require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Descendent = require('descendent')
    var Destructible = require('destructible')
    var descendent = new Descendent(process)
    var monitor = require('../monitor')
    var destructible = new Destructible('monitor')
    var path = require('path')
    destructible.completed.wait(async())
    async(function () {
        destructible.monitor('monitor', monitor,  {
            argv: [ 'node', path.join(__dirname, 'child.js') ],
            env: JSON.parse(JSON.stringify(process.env))
        }, descendent, async())
    }, function () {
        destructible.completed.wait(async())
        destructible.destroy()
    }, function (exitCode, signal) {
        okay({
            exitCode: exitCode,
            signal: signal
        }, {
            exitCode: null,
            signal: 'SIGTERM'
        }, 'ran')
    })
}
