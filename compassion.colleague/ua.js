var cadence = require('cadence')
var util = require('util')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.send = cadence(function (async, properties, body) {
    var url = util.format('http://%s/kibitz', properties.location)
    this._ua.fetch({
        url: url,
        post: {
            key: '(' + properties.islandName + ')' + properties.colleagueId,
            post: { kibitz: body }
        },
        nullify: true
    }, async())
})

module.exports = UserAgent
