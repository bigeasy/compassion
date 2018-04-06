var url = require('url')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('compassion.colleague')

var nullify = require('vizsla/nullify')
var jsonify = require('vizsla/jsonify')

function UserAgent (ua, timeout, island, id) {
    this._ua = ua
    this._timeout = timeout
    this._island = island
    this._id = id
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        logger.info('recorded', { source: 'ua', method: envelope.method, $envelope: envelope })
        console.log(envelope.to, envelope.method)
        this._ua.fetch({
            url: envelope.to.url,
        }, {
            url: [ '.', this._island, 'kibitz', this._id ].join('/'),
            post: envelope,
            timeout: 30000, //  this._timeout,
            gateways: [ /* nullify(), */ jsonify({}) ]
        }, async())
    }, function (body, response) {
        if (response.okay) {
            return [ body ]
        }
        console.log(response.statusCode)
        logger.info('recorded', { source: 'ua', method: envelope.method, $body: body })
        return [ null ]
    })
})

module.exports = UserAgent
