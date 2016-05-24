var cadence = require('cadence')
var util = require('util')

function UserAgent (ua) {
    this._ua = ua
}

UserAgent.prototype.send = cadence(function (async, location, body) {
    var url = util.format('http://%s/kibitz', location.location)
    console.log(url, body)
    this._ua.fetch({
        url: url,
        post: {
            islandName: location.islandName,
            colleagueId: location.colleagueId,
            kibitz: body
        },
        nullify: true
    }, async())
})

module.exports = UserAgent
