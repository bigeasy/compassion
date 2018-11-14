var cadence = require('cadence')
var Conduit = require('conduit/conduit')
var Population = require('./population')
var Resolver = require('./resolver/conduit')
var Containerized = require('./containerized')
var Signal = require('signal')

module.exports = cadence(function (async, destructible, binder, properties) {
    var ready = new Signal
    async(function () {
    }, function (resolver) {
        binder.listen(cadence(function (async, destructible, inbox, outbox) {
            async(function () {
                ready.wait(async())
            }, function () {
                destructible.monitor('conduit', Conduit, inbox, outbox, cadence(function (async, request, inbox, outbox) {
                    resolver.resolve(async())
                }), async())
            })
        }), async())
    }, function (olio) {
        async(function () {
            console.log('getting mingle')
            olio.sender('mingle', cadence(function (async, destructible, inbox, outbox) {
                destructible.monitor('conduit', Conduit, inbox, outbox, null, async())
            }), async())
        }, function (conduits) {
            console.log('---', conduits)
        })
    }, function (olio) {
        destructible.monitor('containerized', Containerized, {
            population: new Population(resolver, ua),
            ping: {
                chaperon: 150,
                paxos: 150,
                application: 150
            },
            timeout: {
                chaperon: 450,
                paxos: 450,
                http: 500
            },
            bind: {
                networked: {
                    listen: function (server, callback) {
                        server.listen(8486, '127.0.0.1', callback)
                    },
                    address: '127.0.0.1',
                    port: 8486
                }
            }
        }, async())
        return [ binder.index ]
    })
})
