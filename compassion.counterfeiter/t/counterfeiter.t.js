require('proof')(8, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var path = require('path')
    var abend = require('abend')
    try {
    var Colleague = require('../../compassion.colleague/colleague')
    var Conduit = require('../../compassion.conduit')
    var Counterfeiter = require('../counterfeiter.generic')(Colleague, Conduit)
    } catch (e) {
    var Colleague = require('compassion.colleague/colleague')
    var Conduit = require('compassion.conduit')
    var Counterfeiter = require('compassion.counterfeiter/counterfeiter.generic')(Colleague, Conduit)
    }
    var counterfeiter = new Counterfeiter
    var Signal = require('signal')

    var reduced = new Signal, logger = null

    var Procession = require('procession')

    var createConference = require('./create')(assert, reduced)
    var fourth
    var conference = createConference()
    async(function () {
        counterfeiter.listen(8888, '127.0.0.1', async())
    }, [function () {
        counterfeiter.destroy()
        counterfeiter.completed(async())
    }], function () {
        counterfeiter.bootstrap({ republic: 0, conference: conference, id: 'first' }, async())
    }, function () {
        // counterfeiter.events['first'].dequeue(async())
        counterfeiter.events['first'].join(function (envelope) {
            return envelope.promise == '1/0'
        }, async())
    }, function (entry) {
        counterfeiter.join({
            conference: createConference(),
            id: 'second',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['second'].join(function (envelope) {
            return envelope.promise == '3/0'
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
            return envelope.promise == '6/0'
        }, async())
    }, function () {
        conference.reactor.got.wait(async())
        conference.broadcast('message', 2)
    }, function () {
        console.log('GOT')
        counterfeiter.join({
            conference: fourth = createConference(),
            id: 'fourth',
            leader: 'first',
            republic: counterfeiter.kibitzers['first'].paxos.republic
        }, async())
    }, function () {
        counterfeiter.events['first'].join(function (envelope) {
            return envelope.promise == '8/0'
        }, async())
    }, function () {
        conference.reactor.joined.notify()
    }, function () {
        counterfeiter.events['fourth'].join(function (envelope) {
            return envelope.promise == '8/1'
        }, async())
        counterfeiter.events['third'].join(function (envelope) {
            return envelope.promise == '8/1'
        }, async())
    }, function () {
        // This will test the missing operation branch.
        fourth.invoke('missing', 1, async())
    }, function () {
        fourth.invoke('catalog', 1, async())
    }, function () {
        setTimeout(async(), 1000)
    }, function () {
        console.log("REDUCED WAIT")
        reduced.wait(async())
        conference.broadcast('message', 1)
        counterfeiter.leave('fourth')
    }, function () {
        console.log("DONE")
        counterfeiter.destroy()
        counterfeiter.completed(async())
    }, function () {
        setTimeout(async(), 1000)
    }, function () {
        console.log('here')
        var writable = fs.createWriteStream(path.resolve(__dirname, 'counterfeiter.first.jsons'))
        var shifter = counterfeiter.loggers['first'].shifter()
        var loop = async(function () {
            async(function () {
                shifter.dequeue(async())
            }, function (envelope) {
                if (envelope == null) {
                    writable.end()
                    return [ loop.break ]
                } else {
                    writable.write(JSON.stringify(envelope) + '\n', async())
                }
            })
        })()
    }, function () {
        console.log('here')
        var writable = fs.createWriteStream(path.resolve(__dirname, 'counterfeiter.fourth.jsons'))
        var shifter = counterfeiter.loggers['fourth'].shifter()
        var loop = async(function () {
            async(function () {
                shifter.dequeue(async())
            }, function (envelope) {
                if (envelope == null) {
                    writable.end()
                    return [ loop.break ]
                } else {
                    writable.write(JSON.stringify(envelope) + '\n', async())
                }
            })
        })()
    }, function () {
        console.log('-done')
    })
}
