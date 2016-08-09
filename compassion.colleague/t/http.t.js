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
        colleague.kibitz(request, async())
    })

    var service = new Service

    var UserAgent = require('../ua')
    var Vizsla = require('vizsla')

    var ua = new UserAgent(new Vizsla(service.dispatcher.createWrappedDispatcher()), 'http://127.0.0.1/abend')

    var bootstrapped


    var colleague = new Colleague({
        islandName: 'island',
        colleagueId: 'x',
        ua: ua
    })
    var initialized = false
    colleague.messages.on('message', function (message) {
        if (message.type == 'entry') {
            if (initialized) {
                assert(message.entry.value.number, 0, 'entry')
                bootstrapped()
            } else if (message.entry.promise == '1/0') {
                initialized = true
                colleague.publish(2, { number: 0 }, function () {})
            }
        }
    })

    async(function () {
        colleague.publish(0, { value: 0 }, async())
    }, function () {
        colleague.kibitz({}, async())
    }, function (result) {
        assert(result, null, 'missing')
        colleague.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            requests: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandName: 'island',
            islandId: null,
            colleagueId: 'x',
            government: null
        }, 'health')
        colleague.join({
            body: {
                properties: { location: '127.0.0.1:8080' },
                islandId: 'y',
                liaison: { location: '127.0.0.1:8888' }
            }
        }, async())
    }, function (response) {
        assert(response, {}, 'join')
        bootstrapped = async()
        colleague.bootstrap({
            body: {
                islandId: 'y',
                properties: { location: '127.0.0.1:8080' }
            }
        }, async())
    }, function (response) {
        assert(response, {}, 'bootstrap')
        colleague.health(async())
    }, function (response) {
        delete response.uptime
        assert(response, {
            requests: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 },
            islandName: 'island',
            islandId: 'y',
            colleagueId: 'x',
            government: {
                majority: [ 'x' ],
                minority: [],
                constituents: [],
                promise: '1/0'
            }
        }, 'running health')
        colleague.shutdown()
    })
}
