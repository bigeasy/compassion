require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Reactor = require('reactor')
    var Interlocutor = require('interlocutor')
    var UserAgent = require('vizsla')
    var Population = require('../population')
    var cadence = require('cadence')
    var Resolver = { Static: require('../resolver/static') }

    var resolver = new Resolver.Static([ 'http://127.0.0.1:8080/', 'http://127.0.0.1:8080/' ])

    function Service () {
        this.reactor = new Reactor(this, function (dispatcher) {
            dispatcher.dispatch('GET /island/island/islanders', 'islanders')
        })
    }

    var islanders = [ [ 200, { 'content-type': 'application/json' }, [{
        id: 'first',
        government: {},
        cookie: 0,
        createdAt: 0
    }, {
        id: 'second',
        government: {},
        cookie: 0,
        createdAt: 1
    }]], 404 ]
    Service.prototype.islanders = cadence(function (async) {
        return islanders.shift()
    })

    var service = new Service
    var ua = new UserAgent().bind({
        http: new Interlocutor(service.reactor.middleware),
        nullify: true,
        parse: 'json'
    })

    var resolver = new Resolver.Static([ 'http://127.0.0.1:8080/', 'http://127.0.0.1:8080/' ])
    var population = new Population(resolver, ua)

    async(function () {
        population.census('island', async())
    }, function (members, complete) {
        okay(!complete, 'incomplete')
        okay(members, [{
            id: 'first',
            url: 'http://127.0.0.1:8080/island/island/islander/first/',
            government: {},
            cookie: 0,
            createdAt: 0
        }, {
            id: 'second',
            url: 'http://127.0.0.1:8080/island/island/islander/second/',
            government: {},
            cookie: 0,
            createdAt: 1
        }], 'members')
    })
}
