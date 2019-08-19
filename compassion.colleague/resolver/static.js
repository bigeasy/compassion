class Static {
    constructor (urls) {
        this._urls = urls
    }

    resolve (callback) {
        return this._urls
    }
}

module.exports = Static
