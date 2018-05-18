var url = require('url')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('compassion.colleague')

function UserAgent (ua, timeout, island, id) {
    this._ua = ua
    this._timeout = timeout
    this._island = island
    this._id = id
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        logger.info('recorded', { source: 'ua', method: envelope.method, $envelope: envelope })
        this._ua.fetch({
            url: envelope.to.url
        }, {
            url: './kibitz',
            post: envelope,
            timeout: 30000, //  this._timeout,
            parse: 'json',
            nullify: true
        }, async())
    }, function (body) {
        return [ body ]
    })
})

module.exports = UserAgent
