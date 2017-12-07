module.exports = function (assert, reduced) {
    var Monotonic = require('monotonic').asString
    try {
    var Conference = require('../../compassion.conference/conference')
    } catch (e) {
    var Conference = require('../conference')
    }
    var Signal = require('signal')
    var cadence = require('cadence')
    var reactor = {
        got: new Signal,
        joined: new Signal,
        responder: cadence(function (async, conference, header, queue) {
            assert(header.test, 'responder')
            queue.push(1)
            queue.push(null)
        }),
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
            var shifter = conference.request('first', { test: true }).shifter()
            async(function () {
                shifter.dequeue(async())
            }, function (envelope) {
                conference.boundary()
                if (conference.replaying) {
                    assert(envelope, 1, 'request envelope')
                }
            }, function () {
                shifter.dequeue(async())
            }, function (envelope) {
                if (conference.replaying) {
                    assert(envelope, null, 'request eos')
                }
            }, function () {
                conference.record(function (callback) { callback(null, 'x') }, async())
            }, function (result) {
                assert(result, 'x', 'record error-first callback')
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
            async(function () {
                if (value == 2 && conference.id == 'third') {
                    this.got.unlatch()
                    this.joined.wait(async())
                }
            }, function () {
                return value - 1
            })
        }),
        government: cadence(function (async, conference) {
            if (conference.government.promise == '1/0') {
                assert(true, 'got a government')
            }
        }),
        messages: cadence(function (async, conference, reduction) {
            if (conference.id == 'third' && reduction.request == 2) {
                assert(reduction.arrayed.sort(function (a, b) { return Monotonic.compare(a.promise, b.promise) }), [{
                    promise: '1/0', id: 'first', value: 1
                }, {
                    promise: '2/0', id: 'second', value: 1
                }, {
                    promise: '4/0', id: 'third', value: 1
                }, {
                    promise: '7/0', id: 'fourth', value: 1
                }], 'reduced responses 1')
            } else if (conference.id == 'third' && reduction.request == 1) {
                assert(reduction.request, 1, 'reduced request')
                assert(reduction.arrayed.sort(function (a, b) { return Monotonic.compare(a.promise, b.promise) }), [{
                    promise: '1/0', id: 'first', value: 0
                }, {
                    promise: '2/0', id: 'second', value: 0
                }, {
                    promise: '4/0', id: 'third', value: 0
                }], 'reduced responses')
        console.log("REDUCED UNLATCH")
                reduced.unlatch()
            }
        }),
        exile: cadence(function (async, conference, id, promise, properties) {
            if (conference.id == 'third') {
                assert({
                    id: id,
                    promise: promise,
                    properties: properties
                }, {
                    id: 'fourth',
                    promise: '7/0',
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
