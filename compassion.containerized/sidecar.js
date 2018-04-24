var cadence = require('cadence')
var Local = require('./local')
var Networked = require('./networked')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

function Sidecar (options) {
}

module.exports = cadence(function (async, destructible, options) {
    var colleagues = { island: {}, token: {} }, local, networked
    async(function () {
        local = new Local(destructible, colleagues,
            'http://' + options.bind.networked.address + ':' + options.bind.networked.port + '/')
        var server = http.createServer(local.reactor.middleware)
        destroyer(server)
        destructible.destruct.wait(server, 'destroy')
        delta(destructible.monitor('local')).ee(server).on('close')
        options.bind.local.listen(server, async())
    }, function () {
        networked = new Networked(destructible, colleagues)
        var server = http.createServer(networked.reactor.middleware)
        destroyer(server)
        destructible.destruct.wait(server, 'destroy')
        delta(destructible.monitor('networked')).ee(server).on('close')
        options.bind.networked.listen(server, async())
    }, function () {
        return [ local, networked ]
    })
})
