require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var UserAgent = require('../ua')

    var Vizsla = require('vizsla')

    var cadence = require('cadence')
    var Dispatcher = require('inlet/dispatcher')

    function Service () {
        var dispatcher = new Dispatcher(this)
        dispatcher.dispatch('POST /kibitz', 'kibitz')
        this.dispatcher = dispatcher
    }

    Service.prototype.kibitz = cadence(function () { return { kibitzer: true } })

    var service = new Service

    var ua = new UserAgent(new Vizsla(service.dispatcher.createWrappedDispatcher()),
        'http://127.0.0.1/discover')

    async(function () {
        ua.send('127.0.0.1:8888', {}, async())
    }, function (response) {
        assert(response, { kibitzer: true }, 'kibitzer')
    })
}
