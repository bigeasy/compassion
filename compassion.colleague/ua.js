var url = require('url')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('compassion.colleague')

function UserAgent (ua) {
    this._ua = ua
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
            nullify: false
        }, async())
    }, function (body, response) {
        logger.info('recorded', { source: 'ua', method: envelope.method, $body: body })
        return [ body ]
    })
})

module.exports = UserAgent
