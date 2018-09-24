var Operation = require('operation')

function Canary () {
    var vargs = Array.prototype.slice.call(arguments)
    this._terminator = Operation(vargs)
    this._timeout = null
    this._frequency = vargs.shift()
}

Canary.prototype.ping = function () {
    this.stop()
    this._timeout = setTimeout(this._terminator, this._frequency)
}

Canary.prototype.stop = function () {
    if (this._timeout) {
        clearTimeout(this._timeout)
    }
}

module.exports = Canary
