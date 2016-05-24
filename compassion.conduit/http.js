var cadence = require('cadence')
var Cliffhanger = require('cliffhanger')
var Dispatcher = require('inlet/dispatcher')
var WebSocket = require('faye-websocket')
var url = require('url')

function Conduit () {
    this._cliffhanger = new Cliffhanger()
    this._islands = {}
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('POST /bootstrap', 'bootstrap')
    dispatcher.dispatch('POST /join', 'join')
    dispatcher.dispatch('POST /kibitz', 'kibitz')
    dispatcher.dispatch('GET /health', 'health')
    this.dispatcher = dispatcher
    this.onupgrade = this.upgrade.bind(this)
}


Conduit.prototype.upgrade = function (request, socket, body) {
    var path = (url.parse(request.url).path || '').split('/')
    if (WebSocket.isWebSocket(request) && path.length == 3) {
        var islandName = path[1], colleagueId = path[2]
        var ws = new WebSocket(request, socket, body)
        ws.on('message', function (event) {
// TODO How does `_cliffhanger` do a timeout?
        })

        var islands = this._islands, cliffhanger = this._cliffhanger

        var island = islands[islandName]
        if (island == null) {
            island = islands[islandName] = {}
        }
        var listener = island[colleagueId]
        if (listener != null) {
            listener.close.call(null)
        }
        listener = island[colleagueId] = { close: close, ws: ws }

        function message (event) {
            var message = JSON.parse(event.data)
            cliffhanger.resolve(message.cookie, [ null, message.body ])
        }

        function close () {
            ws.removeListener('close', close)
            ws.removeListener('message', message)
            delete islands[islandName][colleagueId]
            if (Object.keys(islands[islandName]).length == 0) {
                delete islands[islandName]
            }
            ws.close()
        }

        ws.on('message', message)
        ws.on('close', close)
    }
}

Conduit.prototype._send = cadence(function (async, type, request) {
    var body = request.body
    var island = this._islands[body.islandName]
    if (island != null) {
        var listener = island[body.colleagueId]
        if (listener != null) {
            var cookie = this._cliffhanger.invoke(async())
            listener.ws.send(JSON.stringify({ type: type, cookie: cookie, body: request.body }))
            return
        }
    }
    request.raise(404)
})

; [ 'bootstrap', 'join', 'kibitz' ].forEach(function (name) {
    Conduit.prototype[name] = cadence(function (async, request) {
        this._send(name, request, async())
    })
})

Conduit.prototype.health = cadence(function (async) {
    var inquire = []
    for (var islandName in this._islands) {
        for (var colleagueId in this._islands[islandName]) {
            inquire.push({
                islandName: islandName,
                colleagueId: colleagueId,
                listener: this._islands[islandName][colleagueId]
             })
        }
    }
    async(function () {
        async.map(function (inquiry) {
            async(function () {
                async([function () {
                    var cookie = this._cliffhanger.invoke(async())
                    inquiry.listener.ws.send(JSON.stringify({ type: 'health', cookie: cookie, body: null }))
                }, /^expired$/, function () {
                    return [ null ]
                }])
            }, function (health) {
                return {
                    islandName: inquiry.islandName,
                    colleagueId: inquiry.colleagueId,
                    health: health
                }
            })
        })(inquire)
    }, function (health) {
        return {
            instanceId: 0,
            colleagues: health
        }
    })
})

module.exports = Conduit
