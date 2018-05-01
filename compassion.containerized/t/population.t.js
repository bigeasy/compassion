require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Reactor = require('reactor')
    var Interlocutor = require('interlocutor')
    var UserAgent = require('vizsla')
    var Population = require('../population')
    var cadence = require('cadence')
    var nullify = require('vizsla/nullify')
    var jsonify = require('vizsla/jsonify')

    function Service () {
        this.reactor = new Reactor(this, function (dispatcher) {
            dispatcher.dispatch('GET /island/island/islanders', 'islanders')
        })
    }

    var islanders = [ [ 200, { 'content-type': 'application/json' }, [{ id: 'first' }, { id: 'second' }]], 404 ]
    Service.prototype.islanders = cadence(function (async) {
        return islanders.shift()
    })

    var service = new Service
    var ua = new UserAgent().bind({
        http: new Interlocutor(service.reactor.middleware),
        gateways: [ nullify(), jsonify(), nullify() ]
    })

    var population = new Population(ua)

    async(function () {
        population.census([ 'http://127.0.0.1:8080/', 'http://127.0.0.1:8080/' ], 'island', async())
    }, function (members, complete) {
        okay(!complete, 'incomplete')
        okay(members, [{ id: 'first' }, { id: 'second' }], 'members')
    })
}
