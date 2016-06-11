var cadence = require('cadence')

function Conduit (process) {
    this._process = process
    this.events = process
}

Conduit.prototype.send = cadence(function (async, reinstatementId, entry) {
    this._process.send({
        type: 'publish',
        reinstatementId: reinstatementId,
        entry: entry
    })
})

module.exports = Conduit
