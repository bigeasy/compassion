function Procedure (conduit) {
    this._conduit = conduit
}

Procedure.prototype.resolve = function (callback) {
    this._conduit.connect({}).inbox.dequeue(callback)
}

module.exports = Procedure
