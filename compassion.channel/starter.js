var interrupt = require('interrupt').createInterrupter('compassion.colleague')
var Destructible = require('destructible')
var cadence = require('cadence')

function Starter (signal) {
    this._shifter = queue.shifter()
    this._destructible = new Destructible('starter')
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('shifter', this._shifter, 'destroy')
    this._signal = signal
}

Starter.prototype.started = cadence(function (async) {
    async(function () {
        this._shifter.dequeue(async())
    }, function (envelope) {
        interrupt.assert(envelope && envelope.module == 'colleague' && envelope.method == 'pipe', 'starter')
        this.ready.unlatch()
        this.cancel()
    })
})

Starter.prototype.cancel = function () {
    this._destructible.destroy()
}

module.exports = Starter
