var cadence = require('cadence')
var util = require('util')
var assert = require('assert')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.send = cadence(function (async, properties, body) {
    var url = util.format('http://%s/kibitz', properties.location)
    this._ua.fetch({
        url: url,
        post: {
            key: '(' + body.islandId + ')' + body.id,
            post: { kibitz: body }
        },
        nullify: true
    }, async())
})

module.exports = UserAgent
