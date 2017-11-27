var url = require('url')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('compassion.colleague')

var nullify = require('vizsla/nullify')
var jsonify = require('vizsla/jsonify')

function UserAgent (ua, timeout) {
    this._ua = ua
    this._timeout = timeout
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        logger.info('recorded', { source: 'ua', method: envelope.method, $envelope: envelope })
        this._ua.fetch({
            url: envelope.to.url,
        }, {
            url: './kibitz',
            headers: {
                'x-kibitz-method': envelope.method,
                'x-kibitz-envelope': JSON.stringify(envelope)
            },
            post: envelope,
            timeout: this._timeout,
            gateways: [ nullify(), jsonify({}) ]
        }, async())
    }, function (body, response) {
        logger.info('recorded', { source: 'ua', method: envelope.method, $body: body })
        return [ body ]
    })
})

module.exports = UserAgent
