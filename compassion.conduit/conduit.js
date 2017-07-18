var delta = require('delta')
var cadence = require('cadence')

var http = require('http')

var Operation = require('operation/variadic')

var Middleware = require('./middleware')
var Shuttle = require('prolific.shuttle')

var Destructible = require('destructible')

var Rendezvous = require('assignation/rendezvous')
var Downgrader = require('downgrader')

var Signal = require('signal')

function Conduit () {
    this._destructible = new Destructible('compassion.conduit')
    this.ready = new Signal
}

Conduit.prototype.listen = cadence(function (async, port, address) {
    var downgrader = new Downgrader
    var rendezvous = new Rendezvous
    console.log('zzzzzz')

    downgrader.on('socket', Operation([ rendezvous, 'upgrade' ]))

    var connect = require('connect')
    var app = require('connect')()
        .use(Operation([ rendezvous, 'middleware' ]))
        .use(new Middleware(rendezvous).reactor.middleware)

    var server = http.createServer(app)

    server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

    this._destructible.addDestructor('server', server, 'close')
    this._destructible.addDestructor('rendezvous', rendezvous, 'destroy')

    async(function () {
        server.listen(port, address, async())
    }, function () {
        console.log('listening !!!', port, address)
        delta(async()).ee(server).on('close')
        this.ready.unlatch()
    })
})

Conduit.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Conduit
