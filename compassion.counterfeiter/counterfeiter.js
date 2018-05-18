var Containerized = require('compassion.colleague/containerized')
var Conference = require('compassion.conference')
var cadence = require('cadence')
var Population = require('compassion.colleague/population')
var Resolver = { Static: require('compassion.colleague/resolver/static') }
var coalesce = require('extant')
var UserAgent = require('vizsla')

module.exports = cadence(function (async, destructible, options) {
    var port = {
        networked: coalesce(options.port, 8486),
        local: coalesce(options.port, 8386),
    }
    destructible.monitor('containerized', Containerized, {
        Conference: Conference,
        population: new Population(new Resolver.Static([ 'http://127.0.0.1:' + port.networked + '/' ]), new UserAgent),
        bind: {
            local: {
                listen: function (server, callback) {
                    server.listen(port.local, '127.0.0.1', callback)
                }
            },
            networked: {
                listen: function (server, callback) {
                    server.listen(port.networked, '127.0.0.1', callback)
                },
                address: '127.0.0.1',
                port: port.networked
            }
        }
    }, async())
})
