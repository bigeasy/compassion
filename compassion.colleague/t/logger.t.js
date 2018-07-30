require('proof')(2, prove)

function prove (okay) {
    var Logger = require('../logger')
    var logger = Logger({
        notice: function (name, properties) {
            okay({
                name: name,
                properties: properties
            }, {
                name: 'event',
                properties: { $envelope: {} }
            }, 'envelope')
        }
    })
    logger({}, function () {
        okay(true, 'called back')
    })
}
