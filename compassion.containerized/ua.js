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
        console.log('>>>', envelope.to, envelope.method)
        this._ua.fetch({
            url: envelope.to.url,
            post: envelope,
            timeout: 30000, //  this._timeout,
            gateways: [ jsonify(), nullify() ]
        }, async())
    }, function (body, response) {
        console.log('>>>>', body, response)
        return [ body ]
    })
})

module.exports = UserAgent
