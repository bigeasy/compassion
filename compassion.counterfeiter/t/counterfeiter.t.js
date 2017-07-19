require('proof')(4, require('cadence')(prove))

function prove (async, assert) {
    var abend = require('abend')
    var Colleague = require('../../compassion.colleague/colleague')
    var Conduit = require('../../compassion.conduit')
    var Counterfeiter = require('../counterfeiter.generic')(Colleague, Conduit)
    var counterfeiter = new Counterfeiter
    var Vizsla = require('vizsla')

    var reduced = null, logger = null

    var Procession = require('procession')

    var cadence = require('cadence')
    var ua = new Vizsla
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
                    assert(envelope, 1, 'socket')
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
                assert(reduction.arrayed, [{
                    id: 'second', value: 0
                }, {
                    id: 'first', value: 0
                }, {
                    id: 'third', value: 0
                }], 'reduced responses')
                reduced()
            }
        }),
        exile: cadence(function (async, conference) {
            if (conference.id == 'third') {
                assert(conference.government.exile, {
                    id: 'fourth',
                    promise: '5/0',
                    properties: { key: 'value', url: 'fourth' }
                }, 'exile')
            }
        })
    }
    var Conference = require('../../compassion.conference/conference')
    assert(Conference, 'require')
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
    var fourth
    var conference = createConference()
    async(function () {
        counterfeiter.listen(8888, '127.0.0.1', async())
    }, [function () {
        counterfeiter.destroy()
        counterfeiter.completed(async())
    }], function () {
        counterfeiter.bootstrap({ conference: conference, id: 'first' }, async())
    }, function () {
       // counterfeiter.events['first'].dequeue(async())
        counterfeiter.events['first'].join(function (envelope) {
            return envelope.promise == '1/2'
        }, async())
    }, function (entry) {
        counterfeiter.join({
            conference: createConference(),
            id: 'second',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['first'].join(function (envelope) {
            return envelope.promise == '2/1'
        }, async())
    }, function () {
        counterfeiter.join({
            conference: createConference(),
            id: 'third',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['first'].join(function (envelope) {
            return envelope.promise == '4/4'
        }, async())
    }, function () {
        counterfeiter.join({
            conference: fourth = createConference(),
            id: 'fourth',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['fourth'].join(function (envelope) {
            console.log('FOURTH', envelope)
            return envelope.promise == '5/5'
        }, async())
        counterfeiter.events['third'].join(function (envelope) {
            return envelope.promise == '5/5'
        }, async())
    }, function () {
        return [ async.break ]
        fourth.invoke('catalog', 1, async())
    }, function () {
        reduced = async()
        conference.broadcast('message', 1)
//        counterfeiter.leave('fourth')
    }, function () {
        logger = counterfeiter.loggers['fourth']
        // counterfeiter.done.wait(async())
        counterfeiter.destroy()
    }, function () {
        return
        var conference = createConference()
        var Channel = require('compassion.channel/channel')
        var Merger = require('compassion.channel/merger')
        var Kibitzer = require('kibitz')
        var kibitzer = new Kibitzer({ id: 'fourth', ping: 250, timeout: 1000 })
        var channel = new Channel(kibitzer)
        var merger = new Merger(kibitzer, channel)
        var Recorder = require('compassion.channel/recorder')
        var l = require('prolific.logger').createLogger('x')
        kibitzer.played.pump(new Recorder('kibitz', l, merger.play), 'push')
        kibitzer.paxos.outbox.pump(new Recorder('paxos', l, merger.play), 'push')
        kibitzer.islander.outbox.pump(new Recorder('islander', l, merger.play), 'push')
        channel.pump(conference.write, conference.read)
        var copy = logger.shifter()
        copy.pump(function (envelope) {
            console.log('>>>>', envelope)
        })
        async(function () {
            merger.ready.wait(async())
        }, function () {
            logger.pump(merger.replay, 'enqueue')
        })
        merger.merge(async())
    })
}
