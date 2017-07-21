require('proof')(4, require('cadence')(prove))

function prove (async, assert) {
    var fs = require('fs')
    var path = require('path')
    var Signal = require('signal')
    var Staccato = require('staccato')
    var reduced = new Signal
    var createConference = require('./create')(assert, reduced)
    var conference = createConference()
    var Channel = require('../../compassion.channel/channel')
    var Merger = require('../../compassion.channel/merger')
    var Kibitzer = require('kibitz')
    var kibitzer = new Kibitzer({ id: 'fourth', ping: 1000, timeout: 3000 })
    var channel = new Channel(kibitzer)
    var merger = new Merger(kibitzer, channel)
    var byline = require('byline')
    var Recorder = require('../../compassion.channel/recorder')
    var l = require('prolific.logger').createLogger('x')
    kibitzer.played.shifter().pump(new Recorder('kibitz', l, merger.play), 'push')
    kibitzer.paxos.outbox.shifter().pump(new Recorder('paxos', l, merger.play), 'push')
    kibitzer.islander.outbox.shifter().pump(new Recorder('islander', l, merger.play), 'push')
    channel.pump(conference)

    async(function () {
        merger.merge(async())
        async(function () {
            merger.ready.wait(async())
        }, function () {
            var readable = new Staccato.Readable(byline(fs.createReadStream(path.resolve(__dirname, 'counterfeiter.jsons'))))
            var loop = async(function () {
                async(function () {
                    readable.read(async())
                }, function (line) {
                    if (line == null) {
                        merger.replay.push(null)
                        return [ loop.break ]
                    } else {
                        merger.replay.push(JSON.parse(line.toString()))
                    }
                })
            })()
        })
    })
}
