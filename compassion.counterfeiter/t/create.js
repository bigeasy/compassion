module.exports = function (assert, reduced) {
    var Monotonic = require('monotonic').asString
    var Conference = require('../../compassion.conference/conference')
    var cadence = require('cadence')
    var reactor = {
        responder: function (conference, header, queue) {
            assert(header.test, 'responder')
            queue.push(1)
            queue.push(null)
        },
        bootstrap: cadence(function (async) {
            return null
        }),
        join: cadence(function (async, conference) {
            if (conference.id != 'fourth') {
                return []
            }
            assert(conference.getProperties('fourth'), {
                key: 'value',
                url: 'http://127.0.0.1:8888/fourth/'
            }, 'get properties')
            // TODO Ideally this is an async call that returns a Procession on
            // replay that has the cached values.
            var shifter = conference.replaying
                        ? null
                        : conference.request('first', { test: true }).shifter()
            async(function () {
                conference.record(function (callback) { shifter.dequeue(callback) }, async())
            }, function (envelope) {
                conference.boundary()
                if (conference.replaying) {
                    assert(envelope, 1, 'request envelope')
                }
            }, function () {
                conference.record(function (callback) { shifter.dequeue(callback) }, async())
            }, function (envelope) {
                if (conference.replaying) {
                    assert(envelope, null, 'request eos')
                }
            })
        }),
        naturalized: cadence(function (async) {
            return null
        }),
        catalog: cadence(function (async, conference, value) {
            if (conference.replaying) {
                assert(value, 1, 'cataloged')
            }
            return []
        }),
        message: cadence(function (async, conference, value) {
            return value - 1
        }),
        government: cadence(function (async, conference) {
            if (conference.government.promise == '1/0') {
                assert(true, 'got a government')
            }
        }),
        messages: cadence(function (async, conference, reduction) {
            if (conference.id == 'third') {
                assert(reduction.request, 1, 'reduced request')
                assert(reduction.arrayed.sort(function (a, b) { return Monotonic.compare(a.promise, b.promise) }), [{
                    promise: '1/0', id: 'first', value: 0
                }, {
                    promise: '2/0', id: 'second', value: 0
                }, {
                    promise: '3/0', id: 'third', value: 0
                }], 'reduced responses')
        console.log("REDUCED UNLATCH")
                reduced.unlatch()
            }
        }),
        exile: cadence(function (async, conference) {
            if (conference.id == 'third') {
                assert(conference.government.exile, {
                    id: 'fourth',
                    promise: '5/0',
                    properties: { key: 'value', url: 'http://127.0.0.1:8888/fourth/' }
                }, 'exile')
            }
        })
    }

    function createConference () {
        return new Conference(reactor, function (constructor) {
            constructor.responder()
            constructor.setProperties({ key: 'value' })
            constructor.bootstrap()
            constructor.join()
            constructor.immigrate(cadence(function (async) {}))
            constructor.naturalized()
            constructor.exile()
            constructor.government()
            constructor.socket()
            constructor.receive('message')
            constructor.reduced('message', 'messages')
            constructor.method('catalog')
        })
    }

    return createConference
}