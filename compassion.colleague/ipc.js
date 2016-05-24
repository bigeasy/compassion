var Reactor = require('reactor')
var cadence = require('cadence')
var Vestibule = require('vestibule')

function Delegate (colleague, child) {
    this._colleague = colleague
    this._colleague.messages.on('message', this.colleagueMessage.bind(this))
    this._messages = new Reactor({ object: this, method: '_colleagueMessage' })
    this._initializers = new Vestibule
    this._initialized = false
    this._child = child
    this._child.on('message', this.childMessage.bind(this))
}

Delegate.prototype.initialize = function (callback) {
    if (this._initialized) {
        callback()
    } else {
        this._initializers.enter(callback)
    }
}

Delegate.prototype._colleagueMessage = cadence(function (async, timeout, message) {
    this._child.send(message, async())
})

Delegate.prototype.colleagueMessage = function (type, value) {
    this._messages.push({ type: type, value: value })
}

Delegate.prototype.childMessage = function (message) {
    switch (message.type) {
    case 'initialized':
        if (!this._initialized) {
            this._initialized = true
            this._initializers.notify()
        }
        break
    case 'publish':
        this._colleague.publish(message.entry)
        break
    }
}

module.exports = Delegate
