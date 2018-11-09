var cadence = require('cadence')
var Local = require('./local')
var Networked = require('./networked')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

module.exports = cadence(function (async, destructible, options) {
    var colleagues = { island: {}, token: {} }, local, networked
    async(function () {
        local = new Local(destructible, colleagues, options)
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
