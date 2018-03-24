require('arguable')(module, require('cadence')(function (async, program) {
    var Conference = require('../../../compassion.conference/conference')
    var Colleague = require('colleague')
    var conference = new Conference({}, function (constructor) {})
    var Destructible = require('destructible')
    var destructible = new Destructible('t/fixtures/example.js')
    destructible.completed.wait(async())
    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('colleague', Colleague, program, conference, async())
    }, function () {
        destructible.completed.wait(async())
    })
}))
