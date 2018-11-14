require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/olio.t')

    var Mock = require('olio/mock')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    var path = require('path')

    cadence(function (async) {
        async(function () {
            destructible.monitor('mock', Mock, {
                socket: 't/socket',
                children: {
                    olio: {
                        path: path.resolve(__dirname, '../olio.js'),
                        workers: 1,
                        properties: {}
                    },
                    mingle: {
                        module: 'mingle/olio',
                        workers: 1,
                        properties: {
                            module: 'mingle.static'
                        }
                    }
                }
            }, async())
        }, function (children) {
            children.client[0].processes[0].conduit.connect({}).inbox.dequeue(async())
        }, function (response) {
            okay({
                isArray: Array.isArray(response),
                response: response
            }, {
                isArray: true,
                response: []
            }, 'olio')
        })
    })(destructible.monitor('test'))
}
