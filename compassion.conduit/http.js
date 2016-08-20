var cadence = require('cadence')
var Cliffhanger = require('cliffhanger')
var Dispatcher = require('inlet/dispatcher')
var url = require('url')
var assert = require('assert')

function Conduit (id) {
    this._cliffhanger = new Cliffhanger()
    this._listeners = {}
    this._instanceId = id
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('POST /bootstrap', 'bootstrap')
    dispatcher.dispatch('POST /join', 'join')
    dispatcher.dispatch('POST /kibitz', 'kibitz')
    dispatcher.dispatch('POST /health', 'health')
    dispatcher.dispatch('GET /colleagues', 'colleagues')
    this.dispatcher = dispatcher
// TODO Should be able to time out explicitly on socket close.
    setInterval(function () {
        this._cliffhanger.expire(Date.now() - 5000)
    }.bind(this), 1000).unref()
}

Conduit.prototype.index = cadence(function () {
    return 'Compassion Conduit API\n'
})

Conduit.prototype.connection = function (ws) {
    var query = url.parse(ws.upgradeReq.url, true).query
    if (query.islandName && query.colleagueId) {
        var listeners = this._listeners, cliffhanger = this._cliffhanger

        var key = '(' + query.islandName + ')' + query.colleagueId

        var listener = listeners[key]
        if (listener != null) {
            listener.close.call(null)
        }
        listener = listeners[key] = { query: query, close: close, ws: ws }

        ws.on('message', message)
        ws.on('close', close)

        function message (event) {
            var message = JSON.parse(event)
            cliffhanger.resolve(message.cookie, [ null, message.body ])
        }

        function close () {
            delete listeners[key]
            ws.removeListener('close', close)
            ws.removeListener('message', message)
            ws.close()
            ws.terminate()
        }
    }
}

Conduit.prototype._send = cadence(function (async, type, request) {
    var body = request.body
    assert(body.islandName && body.colleagueId)
    var key = '(' + body.islandName + ')' + body.colleagueId
    var listener = this._listeners[key]
    if (listener != null) {
        var cookie = this._cliffhanger.invoke(async())
        listener.ws.send(JSON.stringify({ type: type, cookie: cookie, body: body }))
        return
    }
    request.raise(404)
})

; [ 'bootstrap', 'join', 'kibitz', 'health' ].forEach(function (name) {
    Conduit.prototype[name] = cadence(function (async, request) {
        this._send(name, request, async())
    })
})

Conduit.prototype.colleagues = cadence(function (async) {
    var inquire = []
    for (var key in this._listeners) {
        inquire.push(this._listeners[key].query)
    }
    return {
        instanceId: this._instanceId,
        colleagues: inquire
    }
})

module.exports = Conduit
