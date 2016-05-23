var cadence = require('cadence')
var util = require('util')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.send = cadence(function (async, location, body) {
    var url = util.format('http://%s/kibitz', location)
    this._ua.fetch({ url: url, post: body, nullify: true }, async())
})

module.exports = UserAgent
