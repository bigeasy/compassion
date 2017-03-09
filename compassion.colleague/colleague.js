var delta = require('delta')
var cadence = require('cadence')
var Destructor = require('destructible')
var coalesce = require('nascent.coalesce')
var Signal = require('signal')
var Procession = require('procession')
var assert = require('assert')

function Conduit (colleague) {
    this._colleague = colleague
}

function Conference (colleague) {
    this._colleague = colleague
}

Conference.prototype.fromBasin = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    this._colleague.chatter.push(envelope)
    switch (envelope.method) {
    case 'boundary':
    case 'record':
        // For these cases, it was enough to record them.
        break
    case 'response':
        this.responses.push(response)
        break
    case 'naturalized':
        this._colleague._kibitzer.naturalize()
        break
    case 'broadcast':
    case 'reduce':
        this._colleague._kibitzer.publish(envelope)
        break
    }
})

Conference.prototype.fromSpigot = cadence(function (async, envelope) {
    assert(envelope == null)
})

Conference.prototype.request = function (envelope, callback) {
    this._colleague._request(envelope, callback)
}


function Colleague (ua, kibitzer) {
    this._ua = ua
    this._kibitzer = kibitzer

    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')

    this._spigot = new Spigot(new Conference(this))
    this._requester = new Requester('colleague')
    this._spigot.emptyInto(this._requester.basin)

    this._basin = new Basin(new Conference(this))
    this._responder = new Responder(new Conference(this), 'colleague')
    this._responder.spigot.emptyInto(this._basin)

    this.connected = new Signal

    this.chatter = new Procession
    this.responses = new Procession

    this.responses.pump({ object: this, method: '_response' })

    this.demolition = this._destructor.events
}

Colleague.prototype.listen = cadence(function (async, input, output) {
    this._destructor.async(async, 'conduit')(function () {
        this._conduit = new Conduit(input, output)
        this._destructor.addDestructor('multiplexer', this._conduit.destroy.bind(this._conduit))
        this._conduit.spgiot.emptyInto(this._responder.basin)
        this._requester.spigot.emptyInto(this._conduit.basin)
        this._conduit.listen(async())
    })
    this._destructor.async(async, 'log')(function () {
        var shifter = this._kibitzer.islander.log.shifter()
        this._destructor.addDestructor('log', shifter.destroy.bind(shifter))
        var loop = async(function () {
            shifter.dequeue(async())
        }, function (entry) {
            async(function () {
                this._spigot.requests.enqueue(entry && {
                    module: 'colleague',
                    method: 'entry',
                    body: entry
                }, async())
            }, function () {
                if (entry == null) {
                    return [ loop.break ]
                }
            })
        })()
    })
})

Colleague.prototype._request = cadence(function (async, envelope) {
    var properties = this._kibitzer.paxos.government.properties[envelope.to]
    async(function () {
        this._ua.fetch({
            url: properties.url
        }, {
            url: './oob',
            post: envelope,
            nullify: true
        }, async())
    }, function (body) {
        return [ body ]
    })
})

Colleague.prototype.destroy = function () {
    this._destructor.destroy()
}

Colleague.prototype.getProperties = cadence(function (async) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: 'properties',
            body: {
                id: this._kibitzer.paxos.id,
                replaying: false
            }
        }, async())
    }, function (properties) {
        return [ properties ]
    })
})

Colleague.prototype.outOfBand = cadence(function (async, request) {
    async(function () {
        this._requester.request('colleague', {
            module: 'colleague',
            method: request.method,
            from: coalesce(request.from),
            body: request.body
        }, async())
    }, function (response) {
        return [ response ]
    })
})

Colleague.prototype._connect = cadence(function (async, socket) {
})

module.exports = Colleague
