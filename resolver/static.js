class Static {
    constructor (urls) {
        this._urls = urls
    }

    resolve () {
        return this._urls
    }
}

module.exports = Static
