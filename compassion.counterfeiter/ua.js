var cadence = require('cadence')

function UserAgent (counterfeiter) {
    this._counterfeiter = counterfeiter
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        this._counterfeiter._denizens[envelope.to.location].kibitzer.request(envelope, async())
    }, function (body) {
        return [ body ]
    })
})

module.exports = UserAgent
