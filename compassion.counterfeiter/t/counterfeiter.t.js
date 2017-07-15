require('proof')(6, require('cadence')(prove))

function prove (async, assert) {
    var abend = require('abend')
    var Counterfeiter = require('..')
    var counterfeiter = new Counterfeiter

    var reduced = null, logger = null

    var Procession = require('procession')

    var cadence = require('cadence')
    var reactor = {
        socket: cadence(function (async, conference, socket, header) {
            var shifter = socket.read.shifter()
            async(function () {
                shifter.dequeue(async())
            }, function (read) {
                if (header.from == 'fourth') {
                    assert(read, null, 'socket read')
                }
                socket.write.push(1)
                socket.write.push(null)
            })
        }),
        bootstrap: cadence(function (async) {
            return null
        }),
        join: cadence(function (async, conference) {
            if (conference.id != 'fourth') {
                return []
            }
            var shifter = null
            if (!conference.replaying) {
                var socket = { read: new Procession, write: new Procession }
                conference.socket('first', { from: conference.id }, socket)
                socket = { read: socket.write, write: socket.read }
                shifter = socket.read.shifter()
                socket.write.push(null)
            }
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
    var Conference = require('conference')
    assert(Conference, 'require')
    function createConference () {
        return new Conference(reactor, function (constructor) {
            constructor.setProperties({ key: 'value' })
            constructor.bootstrap()
            constructor.join()
            constructor.immigrate(cadence(function (async, id) {
                return
                if (conference.government.promise == '1/0') {
                    async(function () {
                        conference.outOfBand('1', 'request', 1, async())
                    }, function (response) {
                        assert(response, 2, 'out of band')
                        conference.naturalized()
                        var properties = conference.getProperties(id)
                        assert(id, '1', 'immigrate id')
                        assert(conference.getProperties(id), {}, 'immigrate properties')
                        assert(conference.getProperties('1/0'), {}, 'immigrate promise properties')
                        assert(conference.getProperties('2'), null, 'properites not found')
                    })
                }
            }))
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
        counterfeiter.bootstrap({ conference: conference, id: 'first' }, async())
    }, function () {
        counterfeiter.events['first'].dequeue(async())
    }, function () {
        counterfeiter.join({
            conference: createConference(),
            id: 'second',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
        counterfeiter.join({
            conference: createConference(),
            id: 'third',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['first'].join(function (envelope) {
            console.log('--->', envelope)
            return envelope.promise == '4/1'
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
            return envelope.promise == '5/9'
        }, async())
        counterfeiter.events['third'].join(function (envelope) {
            return envelope.promise == '5/9'
        }, async())
    }, function () {
        fourth.invoke('catalog', 1, async())
    }, function () {
        reduced = async()
        conference.broadcast('message', 1)
        counterfeiter.leave('fourth')
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
