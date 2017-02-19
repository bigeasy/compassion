var url = require('url')
var cadence = require('cadence')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        this._ua.fetch({
            url: url.resolve(envelope.to.url, './kibitz'),
            post: envelope,
            nullify: true
        }, async())
    }, function (body, response) {
        return [ body ]
    })
})

module.exports = UserAgent
