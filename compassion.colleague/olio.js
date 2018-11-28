var cadence = require('cadence')
var Conduit = require('conduit/conduit')
var Population = require('./population')
var Resolver = require('./resolver/conduit')
var Containerized = require('./containerized')
var Signal = require('signal')
var UserAgent = require('vizsla')

function Listener (colleague) {
    this.colleague = colleague
}

Listener.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    this.colleague.connect(inbox, outbox, async())
})

module.exports = cadence(function (async, destructible, olio, properties) {
    var ua = new UserAgent
    var ready = new Signal
    async(function () {
        olio.sender('mingle', cadence(function (async, destructible, inbox, outbox) {
            destructible.durable('conduit', Conduit, inbox, outbox, null, async())
        }), async())
    }, function (sender) {
        var resolver = new Resolver(sender.processes[0].conduit)
        destructible.durable('containerized', Containerized, {
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
    }, function (colleague) {
        return new Listener(colleague)
    })
})
