var cadence = require('cadence')
var util = require('util')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.send = cadence(function (async, properties, body) {
    console.log(properties, body)
    var url = util.format('http://%s/kibitz', properties.location)
    this._ua.fetch({
        url: url,
        post: {
            islandName: properties.islandName,
            colleagueId: properties.colleagueId,
            kibitz: body
        },
        nullify: true
    }, async())
})

module.exports = UserAgent
