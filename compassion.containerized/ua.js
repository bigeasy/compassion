var url = require('url')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('compassion.colleague')

var nullify = require('vizsla/nullify')
var jsonify = require('vizsla/jsonify')
var unify = require('vizsla/unify')

function UserAgent (ua, timeout, island, id) {
    this._ua = ua
    this._timeout = timeout
    this._island = island
    this._id = id
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        logger.info('recorded', { source: 'ua', method: envelope.method, $envelope: envelope })
        if (!envelope.to) {
            Error.stackTraceLimit = 84
            console.log(new Error().stack)
            console.log(envelope)
            process.exit()
        }
        this._ua.fetch({
            url: envelope.to.url
        }, {
            url: './kibitz',
            post: envelope,
            timeout: 30000, //  this._timeout,
            parse: [ jsonify(), nullify() ]
        }, async())
    }, function (body, response) {
        return [ body ]
    })
})

module.exports = UserAgent
