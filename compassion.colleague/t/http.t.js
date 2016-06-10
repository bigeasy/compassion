require('proof')(6, require('cadence')(prove))

function prove (async, assert) {
    var Colleague = require('../http')

    var cadence = require('cadence')
    var Dispatcher = require('inlet/dispatcher')

    function Service () {
        var dispatcher = new Dispatcher({ object: this })
        dispatcher.dispatch('POST /kibitz', 'kibitz')
        this.dispatcher = dispatcher
    }

    Service.prototype.kibitz = cadence(function (async, request) {
        compassion.kibitz(request, async())
    })

    var service = new Service

    var UserAgent = require('../ua')
    var Vizsla = require('vizsla')
    var Transport = require('vizsla/mock')

    var transport = new Transport(service.dispatcher.createWrappedDispatcher())
    var ua = new UserAgent(new Vizsla({ transport: transport }), 'http://127.0.0.1/abend')

    var bootstrapped

    function Child (compassion) {
        var initialized = false
        compassion.messages.on('message', function (message) {
            if (message.type == 'entry') {
                if (initialized) {
                    assert(message.entry.value.number, 0, 'entry')
                    bootstrapped()
                } else if (message.entry.promise == '1/0') {
                    initialized = true
                    compassion.publish(2, { number: 0 })
                }
            }
        })
    }

    var compassion = new Colleague({ colleagueId: 'x', Delegate: Child, ua: ua })

    compassion.publish(0, { value: 0 })

    async(function () {
        compassion.kibitz({}, async())
    }, function (result) {
        assert(result, null, 'missing')
        compassion.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            requests: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandId: null,
            legislatorId: 'x',
            government: null
        }, 'health')
        compassion.join({
            body: {
                properties: { location: '127.0.0.1:8080' },
                islandId: 'y',
                liaison: { location: '127.0.0.1:8888' }
            }
        }, async())
    }, function (response) {
        assert(response, {}, 'join')
        bootstrapped = async()
        compassion.bootstrap({
            body: {
                islandId: 'y',
                properties: { location: '127.0.0.1:8080' }
            }
        }, async())
    }, function (response) {
        assert(response, {}, 'bootstrap')
        compassion.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            requests: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandId: 'y',
            legislatorId: 'x',
            government: {
                majority: [ 'x' ],
                minority: [],
                constituents: [],
                promise: '1/0'
            }
        }, 'running health')
        compassion.shutdown()
    })
}
