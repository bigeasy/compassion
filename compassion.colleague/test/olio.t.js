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
            destructible.durable('mock', Mock, {
                socket: path.join(__dirname, 'socket'),
                constituents: {
                    compassion: {
                        path: path.resolve(__dirname, '../olio.js'),
                        workers: 1,
                        properties: {}
                    },
                    child: {
                        path: path.resolve(__dirname, './child.js'),
                        workers: 1,
                        properties: {}
                    },
                    mingle: {
                        module: 'mingle/olio',
                        workers: 1,
                        properties: {
                            module: 'mingle.static',
                            format: 'http://%s:%d/',
                            addresses: [ '127.0.0.1:8486' ]
                        }
                    }
                }
            }, async())
        }, function (children) {
            children.child[0].bootstrapped.wait(async())
        }, function (bootstrapped) {
            okay(bootstrapped, 'bootstrapped', 'bootstrapped')
        })
    })(destructible.durable('test'))
}
