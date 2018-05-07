var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('compassion.conference')
var Procession = require('procession')
var Monotonic = require('monotonic').asString
var assert = require('assert')
var Vizsla = require('vizsla')
var raiseify = require('vizsla/raiseify')
var nullify = require('vizsla/nullify')
var jsonify = require('vizsla/jsonify')
var coalesce = require('extant')
var Cubbyhole = require('cubbyhole')
var rescue = require('rescue')

function Conference (destructible, network, registration) {
    this._destructible = destructible
    this._ua = new Vizsla().bind({
        url: registration.url,
        gateways: [ nullify([ 0 ]), raiseify() ]
    })
    this._id = registration.id
    this._url = registration.url
    this._government = null
    this.outbox = new Procession
    this._network = network
    this._cookie = '0'
    this._snapshots = new Cubbyhole
    this._postbacks = { reduced: {}, receive: {} }
    this._broadcasts = {}
    ; ('bootstrap join arrive government acclimated depart'.split(' ')).forEach(function (postback) {
        this._postbacks[postback] = !! registration[postback]
    }, this)
    coalesce(registration.reduced, []).forEach(function (method) {
        this._postbacks.reduced[method] = true
    }, this)
    coalesce(registration.receive, []).forEach(function (method) {
        this._postbacks.receive[method] = true
    }, this)
}

Conference.prototype._postback = cadence(function (async, path, envelope) {
    var search = path.slice(), postbacks = this._postbacks
    while (search.length != 0) {
        postbacks = postbacks[search.shift()]
    }
    if (postbacks) {
        async([function () {
            this._ua.fetch({
                url: path.join('/'),
                post: envelope,
                parse: [ jsonify(), raiseify() ]
            }, async())
        }, function (error) {
            throw interrupt('postback', error)
        }])
    } else {
        return null
    }
})

Conference.prototype.getSnapshot = cadence(function (async, promise) {
    this._snapshots.wait(promise, async())
})

Conference.prototype.entry = cadence(function (async, entry) {
    async([function () {
        if (entry == null) {
            return []
        }
        if (entry.method == 'government') {
            this._government = entry.government
            this.isLeader = this._government.majority[0] == this._id
            var properties = entry.properties
            async(function () {
                if (entry.body.arrive) {
                    var arrival = entry.body.arrive
                    async(function () {
                        if (entry.body.promise == '1/0') {
                            this._postback([ 'bootstrap' ], {
                                self: this._id,
                                government: this._government
                            }, async())
                        } else if (arrival.id == this._id) {
                            this._postback([ 'join' ], {
                                self: this._id,
                                government: this._government
                            }, async())
                        }
                    }, function () {
                        this._postback([ 'arrive' ], {
                            self: this._id,
                            government: this._government,
                            arrived: arrival
                        }, async())
                    }, function () {
                        if (arrival.id != this._id) {
                            var broadcasts = []
                            for (var key in this._broadcasts) {
                                broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                            }
                            this._snapshots.set(this._government.promise, null, broadcasts)
                        } else if (this._government.promise != '1/0') {
                            async(function () {
                                this._network.broadcasts(this._government.promise, async())
                            }, function (body) {
                                async.forEach(function (broadcast) {
                                    async(function () {
                                        this.entry({
                                            // paxos
                                            body: {
                                                // islander
                                                body: {
                                                    module: 'conference',
                                                    method: 'broadcast',
                                                    internal: broadcast.internal,
                                                    key: broadcast.key,
                                                    body: {
                                                        method: broadcast.method,
                                                        body: broadcast.request
                                                    }
                                                }
                                            }
                                        }, async())
                                    }, function () {
                                        async.forEach(function (promise) {
                                            this.entry({
                                                // paxos
                                                body: {
                                                    // islander
                                                    body: {
                                                        module: 'conference',
                                                        method: 'reduce',
                                                        from: promise,
                                                        key: broadcast.key,
                                                        body: broadcast.responses[promise]
                                                    }
                                                }
                                            }, async())
                                        })(Object.keys(broadcast.responses))
                                    })
                                })(body)
                            })
                        }
                    })
                } else if (entry.body.departed) {
                    async(function () {
                        this._postback([ 'depart' ], {
                            self: this._id,
                            government: this._government,
                            departed: entry.body.departed
                        }, async())
                    }, function () {
                        var depart = entry.body.departed
                        var promise = depart.promise
                        var broadcasts = []
                        for (var key in this._broadcasts) {
                            delete this._broadcasts[key].responses[promise]
                            broadcasts.push(this._broadcasts[key])
                        }
                        this._snapshots.remove(promise)
                        async.forEach(function (broadcast) {
                            this._checkReduced(broadcast, async())
                        })(broadcasts)
                    })
                }
            }, function () {
                if (entry.body.acclimate != null) {
                    this._postback([ 'acclimated' ], {
                        self: this._id,
                        government: this._government
                    }, async())
                }
            }, function () {
                this._postback([ 'government' ], {
                    self: this._id,
                    government: this._government
                }, async())
            }, function () {
                this._network.acclimate()
            })
        } else {
            assert(entry.body.body)
            // Reminder that if you ever want to do queued instead async then the
            // queue should be external and a property of the object the conference
            // operates.

            //
            var envelope = entry.body.body
            switch (envelope.method) {
            case 'broadcast':
                this._broadcasts[envelope.key] = {
                    key: envelope.key,
                    internal: coalesce(envelope.internal, false),
                    method: envelope.body.method,
                    request: envelope.body.body,
                    responses: {}
                }
                async(function () {
                    this._postback([ 'receive', envelope.body.method ], {
                        self: this._id,
                        government: this._government,
                        body: envelope.body.body
                    }, async())
                }, function (response) {
                    this._network.publish(true, {
                        module: 'compassion',
                        method: 'reduce',
                        key: envelope.key,
                        from: this._government.arrived.promise[this._id],
                        body: coalesce(response)
                    })
                })
                break
            // Tally our responses and if they match the number of participants,
            // then invoke the reduction method.
            case 'reduce':
                var broadcast = this._broadcasts[envelope.key]
                broadcast.responses[envelope.from] = envelope.body
                this._checkReduced(broadcast, async())
                break
            }
        }
    }, rescue(/^qualified:compassion.conference#postback$/, function () {
        this._destructible.destroy()
    })])
})

Conference.prototype._checkReduced = cadence(function (async, broadcast) {
    var complete = true
    for (var promise in this._government.arrived.id) {
        if (!(promise in broadcast.responses)) {
            complete = false
            break
        }
    }

    if (complete) {
        var reduced = []
        for (var promise in broadcast.responses) {
            reduced.push({
                promise: promise,
                id: this._government.arrived.id[promise],
                value: broadcast.responses[promise]
            })
        }
        this._postback([ 'reduced', broadcast.method ], {
            self: this._id,
            government: this._government,
            body: {
                request: broadcast.request,
                arrayed: reduced,
                mapped: broadcast.responses
            }
        }, async())
        delete this._broadcasts[broadcast.key]
    }
})

Conference.prototype.broadcast = function (method, message) {
    var cookie = this._nextCookie()
    var uniqueId = this._government.arrived.promise[this._id]
    var key = method + '[' + uniqueId + '](' + cookie + ')'
    this._network.publish(false, {
        module: 'conference',
        method: 'broadcast',
        key: key,
        body: {
            module: 'conference',
            method: method,
            body: message
        }
    })
}

Conference.prototype._nextCookie = function () {
    return this._cookie = Monotonic.increment(this._cookie, 0)
}

module.exports = Conference
