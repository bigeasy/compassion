var cadence = require('cadence')

function UserAgent (counterfeiter) {
    this._counterfeiter = counterfeiter
}

UserAgent.prototype.request = cadence(function (async, envelope) {
    if (this._counterfeiter._denizens[envelope.to.url] == null) {
        return null
    }
    async(function () {
        this._counterfeiter._denizens[envelope.to.url].kibitzer.request(envelope, async())
    }, function (body) {
        return [ body ]
    })
})

UserAgent.prototype.socket = function (url, header, socket) {
    var to = this._counterfeiter._denizens[url]._colleague._client.connect(header)
    to.read.pump(socket.write, 'enqueue')
    socket.read.pump(to.write, 'enqueue')
}

module.exports = UserAgent
