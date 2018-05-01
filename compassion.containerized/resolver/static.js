function Static (urls) {
    this._urls = urls
}

Static.prototype.resolve = function (callback) {
    callback(null, this._urls)
}

module.exports = Static
