require('proof')(2, require('cadence')(prove))

function prove (async, assert) {
    var Monitor = require('../monitor')
    async(function () {
        var monitor = new Monitor
        async(function () {
            monitor.ready.wait(async())
        }, function () {
            assert(monitor.destroyed, 'canceled')
        })
        monitor.destroy()
    }, function () {
        var monitor = new Monitor
        var path = require('path')
        async(function () {
            monitor.run({
                argv: [ 'node', path.join(__dirname, 'child.js') ],
                env: JSON.parse(JSON.stringify(process.env))
            }, async())
        }, function () {
            assert(monitor.destroyed, 'ran')
        })
        async(function () {
            monitor.ready.wait(async())
        }, function () {
            monitor.destroy()
        })
    })
}
