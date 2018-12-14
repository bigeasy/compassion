var cadence = require('cadence')

var coalesce = require('extant')

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
        var ping = coalesce(properties.ping, {})
        var timeout = coalesce(properties.timeout, {})
        var resolver = new Resolver(sender.processes[0].conduit)
        destructible.durable('containerized', Containerized, {
            population: new Population(resolver, ua),
            ping: {
                chaperon: coalesce(ping.chaperon, 150),
                paxos: coalesce(ping.paxos, 150)
            },
            timeout: {
                chaperon: coalesce(timeout.chaperon, 450),
                paxos: coalesce(timeout.paxos, 450),
                http: coalesce(timeout.http, 500)
            },
            bind: {
                iface: coalesce(properties.iface, '127.0.0.1'),
                address: coalesce(properties.address, '127.0.0.1'),
                port: coalesce(properties.port, 8486)
            }
        }, async())
    }, function (colleague) {
        return new Listener(colleague)
    })
})
