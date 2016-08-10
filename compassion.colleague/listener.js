var url = require('url')

var WebSocket = require('ws')

var cadence = require('cadence')
var Delta = require('delta')
var Vestibule = require('vestibule')
var Reactor = require('reactor')

function Listener (colleague) {
    this.listening = new Vestibule
    this._colleague = colleague
    this._stopped = false
    this._messages = new Reactor({ object: this, method: '_message' })
    this._ws = null
}

Listener.prototype.stop = function () {
    if (this._ws != null) {
        this._ws.close()
        this._ws = null
    }
}

Listener.prototype._message = cadence(function (async, timeout, message) {
    async(function () {
        message = JSON.parse(message)
        this._colleague.request(message.body, async())
    }, function (body) {
        this._ws.send(JSON.stringify({ cookie: message.cookie, body: body }))
    })
})

Listener.prototype.message = function (message) {
    this._messages.push(message)
}

Listener.prototype.listen = cadence(function (async, conduit) {
    var islandName = this._colleague.islandName
    var colleagueId = this._colleague.colleagueId
    var key = '(' + islandName + ')' + colleagueId
    var parsed = {
        protocol: 'ws:',
        slashes: true,
        host: conduit,
        pathname: '/',
        query: { key: key, islandName: islandName, colleagueId: colleagueId }
    }
    console.log(url.format(parsed))
    this._ws = new WebSocket(url.format(parsed))
    async([function () {
        this.stop()
    }], function () {
        new Delta(async()).ee(this._ws).on('open')
    }, function () {
        new Delta(async()).ee(this._ws)
            .on('message', this.message.bind(this))
            .on('close')
        this.listening.notify()
    })
})

module.exports = Listener
