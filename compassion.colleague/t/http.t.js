require('proof')(7, require('cadence')(prove))

function prove (async, assert) {
    var Compassion = require('../http')

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
        compassion.messages.on('message', function (name, value) {
            if (name == 'entry') {
                if (initialized) {
                    assert(value.value.value.number, 0, 'entry')
                    bootstrapped()
                } else if (value.promise == '1/0') {
                    initialized = true
                    compassion.publish({ number: 0 })
                }
            }
        })
    }

    var compassion = new Compassion({ id: 'x', Delegate: Child, ua: ua })

    compassion.publish({ value: 0 })

    async([function () {
        compassion.kibitz({ raise: function () { throw new Error('missing') } }, async())
    }, function (error) {
        assert(error.message, 'missing', 'kibitzer missing')
    }], function () {
        compassion.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            http: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandId: null,
            instanceId: 'x',
            legislatorId: 'x',
            government: null
        }, 'health')
        compassion.join({
            body: {
                location: '127.0.0.1:8080',
                islandId: 'y',
                liaison: '127.0.0.1:8888'
            }
        }, async())
    }, function (response) {
        assert(response, {}, 'join')
        bootstrapped = async()
        compassion.bootstrap({ body: { islandId: 'y' } }, async())
    }, function (response) {
        assert(response, {}, 'bootstrap')
        compassion.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            http: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandId: 'y',
            instanceId: 'x',
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
