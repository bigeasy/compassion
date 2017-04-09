var cadence = require('cadence')

function UserAgent (network) {
    this._network = network
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    async(function () {
        this._network._kibitzers[envelope.to.location].request(envelope, async())
    }, function (body) {
        return [ body ]
    })
})

module.exports = UserAgent
