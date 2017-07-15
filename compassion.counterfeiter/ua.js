var cadence = require('cadence')
var Procession = require('procession')

function UserAgent (counterfeiter) {
    this._counterfeiter = counterfeiter
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    if (this._counterfeiter._denizens[envelope.to.url] == null) {
        return null
    }
    async(function () {
        envelope = JSON.parse(JSON.stringify(envelope))
        this._counterfeiter._denizens[envelope.to.url].kibitzer.request(envelope, async())
    }, function (body) {
        return [ body ]
    })
})

UserAgent.prototype.socket = function (url, header) {
    var receiver = { read: new Procession, write: new Procession }
    this._counterfeiter._denizens[url]._colleague._client.connect(header, receiver)
    return { read: receiver.write, write: receiver.read }
}

module.exports = UserAgent
