var cadence = require('cadence')
var interrupt = require('interrupt').createInterruptor('compassion.conference')
var Procession = require('procession')

function Conference (ua, id) {
    this._ua = ua
    this._id = id
    this._government = null
    this.outbox = new Procession
}

Conference.prototype._postback = cadence(function (async, path, envelope) {
    async([function () {
        this._ua.postback.fetch({
            url: [ this._government.island, this._id ].concat(path).join('/'),
            post: envelope
        }, async())
    }, function (error) {
        throw interrupt('postback', error)
    }])
})

Conference.prototype.entry = cadence(function (async, entry) {
    if (entry == null) {
        return []
    }
    this.outbox.push({
        module: 'conference',
        method: 'boundary',
        id: this._nextBoundary(),
        // TODO Rename promise.
        entry: entry.promise
    })
    async(function () {
        this._consume(entry, async())
    }, function () {
        this.outbox.push({
            module: 'conference',
            method: 'consumed',
            id: this._nextBoundary(),
            // TODO Rename promise.
            entry: entry.promise
        })
    })
})

Conference.prototype._consume = cadence(function (async, entry) {
    if (entry.method == 'government') {
        this._government = entry.government
        this.isLeader = this._government.majority[0] == this._id
        var properties = entry.properties
        async(function () {
            if (entry.body.arrive) {
                var arrival = entry.body.arrive
                async(function () {
                    if (entry.body.promise == '1/0') {
                        this._postback('bootstrap', {
                            self: this._id,
                            government: this._government
                        }, async())
                        this._operate([ 'bootstrap' ], [ this ], async())
                    } else if (arrival.id == this._id) {
                        this._postback('join', {
                            self: this._id,
                            government: this._government
                        }, async())
                    }
                }, function () {
                    this._operate('arrive', {
                        self: this._id,
                        government: this._government
                    }, async())
                }, function () {
                    if (arrival.id != this._id) {
                        var broadcasts = []
                        for (var key in this._broadcasts) {
                            broadcasts.push(JSON.parse(JSON.stringify(this._broadcasts[key])))
                        }
                        this._backlogs.set(this._government.promise, null, broadcasts)
                    } else if (this._government.promise != '1/0') {
                        this._getBacklog(async())
                    }
                }, function () {
                    this.outbox.push({
                        module: 'conference',
                        method: 'acclimated',
                        body: null
                    })
                })
            } else if (entry.body.departed) {
                async(function () {
                    this._postback('depart', {
                        self: this._id
                        government: this._government
                    }, async())
                }, function () {
                    var depart = entry.body.departed
                    var promise = depart.promise
                    var broadcasts = []
                    for (var key in this._broadcasts) {
                        delete this._broadcasts[key].responses[promise]
                        broadcasts.push(this._broadcasts[key])
                    }
                    this._backlogs.remove(promise)
                    async.forEach(function (broadcast) {
                        this._checkReduced(broadcast, async())
                    })(broadcasts)
                })
            }
        }, function () {
            if (entry.body.acclimate != null) {
                this._operate('acclimated', {
                    self: this._id,
                    government: this._government
                }, async())
            }
        }, function () {
            this._postback('government', {
                self: this._id,
                government: this._government
            }, async())
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
                this.outbox.push({
                    module: 'conference',
                    method: 'reduce',
                    key: envelope.key,
                    internal: coalesce(envelope.internal, false),
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
        ], async())
        delete this._broadcasts[broadcast.key]
    }
})

module.exports = Conference
