var cadence = require('cadence')

var UserAgent = require('./ua')
var Conduit = require('conduit')
var Procedure = require('conduit/procedure')
var Caller = require('conduit/caller')
var Client = require('conduit/client')
var Multiplexer = require('conduit/multiplexer')
var Vizsla = require('vizsla')

var Kibitzer = require('kibitz')
var Recorder = require('./recorder')

var Colleague = require('./colleague')

var Envoy = require('assignation/envoy')

var Pump = require('procession/pump')

var url = require('url')
var http = require('http')
var delta = require('delta')

module.exports = cadence(function (async, destructible, options) {
    async(function () {
        destructible.monitor('caller', Caller, async())
        destructible.monitor('client', Client, async())
    }, function (caller, client) {
        async(function () {
            destructible.monitor('procedure', Procedure, new UserAgent(new Vizsla, options.httpTimeout), 'request', async())
        }, function (procedure) {
            caller.read.shifter().pumpify(procedure.write)
            procedure.read.shifter().pumpify(caller.write)
            destructible.monitor('kibitzer', Kibitzer, {
                caller: caller,
                id: options.id,
                ping: options.ping,
                timeout: options.timeout
            }, async())
        }, function (kibitzer) {
            // TODO This is really a mess.
            new Pump(kibitzer.played.shifter(), options.recorder.call(null, 'kibitz'), 'push').pumpify(destructible.monitor('kibitz.logger'))
            destructible.destruct.wait(function () { kibitzer.played.push(null) })
            new Pump(kibitzer.paxos.outbox.shifter(), options.recorder.call(null, 'paxos'), 'push').pumpify(destructible.monitor('paxos.logger'))
            destructible.destruct.wait(function () { kibitzer.paxos.outbox.push(null) })
            new Pump(kibitzer.islander.outbox.shifter(), options.recorder.call(null, 'islander'), 'push').pumpify(destructible.monitor('islander.logger'))
            destructible.destruct.wait(function () { kibitzer.islander.outbox.push(null) })
            var colleague = new Colleague(client, caller, kibitzer, options.island)
            new Pump(colleague.chatter.shifter(), options.recorder.call(null, 'colleague'), 'push').pumpify(destructible.monitor('colleague.logger'))
            destructible.destruct.wait(function () { colleague.chatter.push(null) })
            async(function () {
                var parsed = url.parse(options.conduit)
                var request = http.request({
                    host: parsed.hostname,
                    port: parsed.port,
                    headers: Envoy.headers('/' + options.id, { host: parsed.hostname + ':' + parsed.port })
                })
                delta(async()).ee(request).on('upgrade')
                request.end()
            }, function (request, socket, header) {
                destructible.destruct.wait(socket, 'destroy')
                destructible.monitor('envoy', Envoy, colleague.middleware, socket, header, async())
            }, function() {
                destructible.monitor('multiplexer', Multiplexer, {
                    conference: caller,
                    incoming: client
                }, async())
            }, function (multiplexer) {
                destructible.destruct.wait(function () {
                    multiplexer.write.push(null)
                })
                return multiplexer
                x.x.x.x
            }, function () {
            })
        })
    })
})
