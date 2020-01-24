class Resolver {
    constructor (conduit) {
        this._conduit = conduit
    }

    resolve (callback) {
        return this._conduit.invoke({})
    }
}

module.exports = Resolver
