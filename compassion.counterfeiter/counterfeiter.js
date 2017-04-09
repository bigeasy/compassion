var cadence = require('cadence')
var Responder = require('conduit/responder')
var Network = require('./network')
var Colleague = require('compassion.colleague/colleague')
var Kibitzer = require('kibitz')
var abend = require('abend')
var Destructor = require('destructible')

function Counterfeiter (network, conference) {
    this._Date = Date
    var kibitzer = this._kibitzer = new Kibitzer({
        id: 'first', ping: 1, timeout: 2
    })
    var responder = new Responder(network.userAgent(kibitzer), 'kibitz', kibitzer.write, kibitzer.read)
    this._colleague = new Colleague(null, kibitzer)
    this._colleague.pump(conference)
    this._destructor = new Destructor('counterfeiter')
}

Counterfeiter.prototype.bootstrap = cadence(function (async) {
    this._destructor.async(async, 'bootstrap')(function () {
        async(function () {
            this._colleague.getProperties(async())
        }, function (properties) {
            console.log(properties)
            this._destructor.async(async, 'kibitzer')(function () {
                this._kibitzer.listen(async())
            })
            this._destructor.async(async, 'log')(function () {
                properties.location = this._kibitzer.paxos.id
                this._colleague.log(async())
                this._kibitzer.bootstrap(this._Date.now(), properties)
                console.log('here')
            })
        })
    })
})

Counterfeiter.prototype.destroy = function () {
    this._kibitzer.destroy()
}

module.exports = Counterfeiter
