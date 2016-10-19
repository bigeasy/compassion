var byline = require('byline')
var cadence = require('cadence')
var delta = require('delta')
var Staccato = require('staccato')
var departure = require('departure')
var Cliffhanger = require('cliffhanger')
var cliffhanger = new Cliffhanger
var map = {}

module.exports = cadence(function (async, staccato, colleague, machine, messages, callbacks) {
    var loop = async(function () {
        staccato.read(async())
    }, function (line) {
        if (line == null) {
            return [ loop.break ]
        }
        var entry = JSON.parse(line.toString())
        switch (entry.qualifier) {
        case 'compassion.colleague':
            switch (entry.name) {
            case 'outOfBandCall':
                departure.raise((messages.shift() || {}).message, entry.message)
                break
            case 'oob':
                throw new Error
                break
            case 'outOfBandReturn':
                (callbacks[entry.invocation])(null, entry.result)
                break
            }
            break
        case 'kibitz':
        case 'paxos':
        case 'islander':
            colleague.kibitzer.play(entry, async())
            break
        }
    })()
})
