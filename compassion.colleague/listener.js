var url = require('url')

var WebSocket = require('ws')

var cadence = require('cadence')
var delta = require('delta')
var Signal = require('signal')
var Reactor = require('reactor')

function Listener (colleague, consumer) {
    this.listening = new Signal
    this._colleague = colleague
    this._consumer = consumer
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
    message = JSON.parse(message)
    async(function () {
        if (message.type == 'oob') {
            this._consumer.oob(message.body.name, message.body.post, async())
        } else {
            this._colleague.request(message.type, message.body, async())
        }
    }, function (response) {
        this._ws.send(JSON.stringify({ cookie: message.cookie, body: response }))
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
    this._ws = new WebSocket(url.format(parsed))
            console.log('listenering')
    async([function () {
        this.stop()
    }], function () {
        delta(async()).ee(this._ws).on('open')
    }, function () {
        delta(async()).ee(this._ws)
            .on('message', this.message.bind(this))
            .on('close')
        this.listening.notify()
    })
})

module.exports = Listener
