var UserAgent = require('./ua')

function Network () {
    this._kibitzers = {}
}

Network.prototype.userAgent = function (kibitzer) {
    var id = kibitzer.paxos.id
    this._kibitzers[id] = kibitzer
    return new UserAgent(this, id)
}

module.exports = Network
