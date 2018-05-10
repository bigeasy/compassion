function Procedure (caller) {
    this._caller = caller
}

Procedure.prototype.resolve = function (callback) {
    this._caller.invoke({}, callback)
}

module.exports = Procedure
