var cadence = require('cadence')

function Cancelable (conference) {
    this._conference = conference
}

Cancelable.prototype.send = cadence(function (async, method, colleagueId, value) {
    this._conference._send(true, '.' + method, colleagueId, value, async())
})

Cancelable.prototype.broadcast = cadence(function (async, method, value) {
    this._conference._broadcast(true, '.' + method, value, async())
})

Cancelable.prototype.reduce = cadence(function (async, method, value) {
    this._conference._reduce(true, '.' + method, value, async())
})

Cancelable.prototype.naturalize = cadence(function (async, participantId) {
    async(function () {
        this._conference._broadcast(true, '!naturalize', participantId, async())
    }, function () {
        return []
    })
})

Cancelable.prototype.exile = cadence(function (async, participantId) {
    async(function () {
        this._conference._broadcast(true, '!exile', participantId, async())
    }, function () {
        return []
    })
})

module.exports = Cancelable
