var abend = require('abend')

var assert = require('assert')

var cadence = require('cadence')

var RBTree = require('bintrees').RBTree
var Operation = require('operation')
var Reactor = require('reactor')

var Cliffhanger = require('cliffhanger')
var Cancelable = require('./cancelable')

var Cache = require('magazine')

function Conference (conduit, self) {
    this.isLeader = false
    this._cliffhanger = new Cliffhanger
    this._colleague = null
    this._conduit = conduit
    this._self = self || null
    this.properties = {}
    this._participantIds = null
    this._broadcasts = new Cache().createMagazine()
    this._reductions = new Cache().createMagazine()
    this._immigrants = []
    this.cancelable = new Cancelable(this)
    this._cancelable = {}
    this._exiles = []
    this._operations = {}
    this._setOperation('reduced', '!naturalize', { object: this, method: '_naturalized' })
}

Conference.prototype._createOperation = function (operation) {
    if (typeof operation == 'string') {
        assert(this._self, 'self cannot be null')
        operation = { object: this._self, method: operation }
    }
    return new Operation(operation)
}

Conference.prototype._setOperation = function (qualifier, name, operation) {
    var key = qualifier + ':' + name
    this._operations[key] = this._createOperation(operation)
}

Conference.prototype._getOperation = function (qualifier, name) {
    return this._operations[qualifier + ':' + name]
}

Conference.prototype.join = function (operation) {
    this._setOperation('internal', 'join', operation)
}

Conference.prototype.immigrate = function (operation) {
    this._setOperation('internal', 'immigrate', operation)
}

Conference.prototype.exile = function (operation) {
// TODO Rename 'invoke' or 'initiate'.
    this._setOperation('internal', 'exile', operation)
}

Conference.prototype.receive = function (name, operation) {
    this._setOperation('receive', '.' + name, operation)
}

Conference.prototype.reduced = function (name, operation) {
    this._setOperation('reduced', '.' + name, operation)
}

Conference.prototype.naturalize = function () {
    assert(this._naturalizing != null, 'nothing is naturalizing')
    if (this.colleagueId == this._naturalizing.colleagueId) {
        this.conduit.naturalize()
    }
    delete this._naturalizing[colleagueId]
}

Conference.prototype._apply = cadence(function (async, qualifier, name, vargs) {
    var operation = this._operations[qualifier + '.' + name]
    if (operation) {
        operation.apply([], vargs.concact(async()))
    }
})

// TODO Should this be parallel with how ever many turnstiles?
Conference.prototype._operate = cadence(function (async, message) {
    async([function () {
        var operation = this._getOperation(message.qualifier, message.method)
        if (operation == null) {
            return null
        }
        operation.apply([], message.vargs.concat(async()))
    }, /^compassion.colleage.confer#cancelled$/m, function () {
        return [ async.break ]
    }])
})

Conference.prototype._message = cadence(function (async, message) {
    if (message.type == 'reinstate') {
        this._colleague = {
            islandId: message.islandId,
            reinstatementId: message.reinstatementId,
            colleagueId: message.colleagueId,
            participantId: null
        }
    } else if (message.entry.value.government) {
        var value = message.entry.value

        // We need an id that is unique across restarts. A colleague may rejoin
        // with the same id. Two colleagues with the same id at the same time is
        // a usage error.
        //
        // We're going to respond to exile immediately within the Conference, so
        // we can run broadcasts, so the application will learn about exiles
        // eventually and always after the participant is gone.
        this._participantIds = {}
        value
            .government
            .majority.concat(value.government.minority)
            .concat(value.government.constituents)
            .forEach(function (id) {
                this._participantIds[id] = value.properties[id].immigrated + ':' + id
            }, this)
        this._colleague.participantId = this._participantIds[this._colleague.colleagueId]

        // Send a collapse message either here or from conduit.
        if (value.collapsed) {
// TODO Not implemented.
            this._broadcasts.clear()
            throw new Error('collapsed')
        } else if (value.government.promise == '1/0') {
            var leader = value.government.majority[0]
// TODO What is all this?
// TODO Come back and think hard about about rejoining.
            this.properties[this._participantIds[leader]] = value.properties[leader]
            this.isLeader = true
            this._operate({
                qualifier: 'internal',
                method: 'join',
                vargs: [ true, this._colleague, value.properties[leader] ]
            }, abend)
            return
        }

// TODO Exile is also indempotent. It will be run whether or not immigration
// completed. Another leader may have run a naturalization almost to completion.
// The naturalization broadcast may have been where the naturalization failed.
// This would mean that participants may have prepared themselves, committed
// themselves, but have not notified the Conference that naturalization has
// completed. Thus, we do this and it is really a rollback.
//
// At the time of writing, this seems like a lot to ask of application
// developers, but it works fine with my initial application of Compassion. Is
// my initial application a special case where indempotency, where rollback is
// easy, or do the requirements laid down by the atomic log send a developer
// down a path of indempotency.
//
// With that in mind, I'm going to, at this point, exile everything, even those
// things that I know have not yet immigrated.
        var exile = value.government.exile
        if (exile) {
            this._exiles.push({
                colleagueId: exile,
                participantId: this._participantIds[exile],
                promise: message.entry.promise
            })
            delete this._participantIds[exile]
        }

        // Order matters. Citizens must be naturalized in the same order in
        // which they immigrated. If not, one citizen might be made leader and
        // not know of another citizens immigration.
        var immigration = value.government.immigrate
        if (immigration) {
// TODO Add immigrated to citizen properties
// TODO Put id in this object.
            this._immigrants.push(this._participantIds[immigration.id])
            this.properties[this._participantIds[immigration.id]] = value.properties[immigration.id]
            if (this._colleague.participantId == this._participantIds[immigration.id]) {
                this._operate({
                    qualifier: 'internal',
                    method: 'join',
                    vargs: [
                        false,
                        this._colleague,
                        value.properties[immigration.id]
                    ]
                }, abend)
            }
        }
    } else if (message.entry.value.type == 'broadcast') {
        var value = message.entry.value
        async(function () {
            this._operate({
                qualifier: 'receive',
                method: value.method,
                vargs: [ value.request ]
            }, async())
        }, function (response) {
            this._conduit.send(this._colleague.reinstatementId, {
                namespace: 'bigeasy.compassion.colleague.conference',
                type: 'reduce',
                from: this._colleague.participantId,
                reductionKey: value.reductionKey,
                cookie: value.cookie,
                method: value.method,
                request: value.request,
                response: response
            }, async())
        })
    } else if (message.entry.value.type == 'reduce') {
        var value = message.entry.value
        // TODO Use Magazine.
        var reduction = this._reductions.hold(value.reductionKey, {})
        var complete = true
        reduction.value[value.from] = value.response
        for (var id in this._participantIds) {
            if (!(this._participantIds[id] in reduction.value)) {
                complete = false
                break
            }
        }
        if (complete) {
            reduction.remove()
            async(function () {
                this._operate({
                    qualifier: 'reduced',
                    method: value.method,
                    vargs: [ reduction.value, value.request ]
                }, async())
            }, function () {
                var cartridge = this._broadcasts.hold(value.reductionKey, null)
                if (cartridge.value != null) {
                    this._cliffhanger.resolve(cartridge.value.cookie, [ null, reduction.value ])
                }
                // TODO Might leak? Use Cadence finally.
                cartridge.release()
            })
        } else {
            reduction.release()
        }
    } else if (message.entry.value.to == this._colleague.participantId) {
        var value = message.entry.value
        var participantId = this._colleague.participantId
        switch (value.type) {
        case 'send':
            if (participantId == value.to) {
                async(function () {
                    this._operate({
                        qualifier: 'receive',
                        method: value.method,
                        vargs: [ value.request ]
                    }, async())
                }, function (response) {
                    this._conduit.send(this._colleague.reinstatementId, {
                        namespace: 'bigeasy.compassion.colleague.conference',
                        type: 'respond',
                        to: value.from,
                        response: response,
                        cookie: value.cookie
                    }, async())
                })
            }
            break
        case 'respond':
            this._cliffhanger.resolve(value.cookie, [ null, value.response ])
            break
        }
    }
    this._checkTransitions()
})

Conference.prototype._checkTransitions = function () {
    if (this.isLeader && this._transition == null) {
        if (this._exiles.length != 0) {
            this._transition = 'exile'
            this._operate({
                qualifier: 'internal',
                method: 'exile',
                vargs: [
                    this._exiles[0].participantId,
                    this.properties[this._exiles[0].participantId],
                    this._exiles[0].promise
                ]
            }, abend)
        } else if (this._immigrants.length != 0) {
            this._transition = 'naturalize'
            this._operate({
                qualifier: 'internal',
                method: 'immigrate',
                vargs: [
                    this._immigrants[0],
                    this.properties[this._immigrants[0]],
                    this.properties[this._immigrants[0]].immigrated
                ]
            }, abend)
        }
    }
}

Conference.prototype.send = cadence(function (async, method, colleagueId, message) {
    this._send(false, '.' + method, colleagueId, message, async())
})

Conference.prototype.broadcast = cadence(function (async, method, message) {
    this._broadcast(false, '.' + method, message, async())
})

Conference.prototype.reduce = cadence(function (async, method, colleagueId, message) {
    this._reduce(false, '.' + method, colleagueId, message, async())
})

Conference.prototype.message = function (message) {
    this._enqueue(message, abend)
}

Conference.prototype._enqueue = function (message, callback) {
    switch (message.type) {
    case 'reinstate':
        this._message(message, callback)
        break
    case 'entry':
        if (message.entry.value.government || message.entry.value.namespace == 'bigeasy.compassion.colleague.conference') {
            this._message(message, callback)
        }
        break
    }
}
Conference.prototype._send = cadence(function (async, cancelable, method, colleagueId, message) {
    var cookie = this._cliffhanger.invoke(async())
    if (cancelable) {
        this._cancelable[cookie] = cancelable
    }
    this._conduit.send(this._colleague.reinstatementId, {
        namespace: 'bigeasy.compassion.colleague.conference',
        type: 'send',
        cancelable: cancelable,
        from: this._participantIds[this._colleague.colleagueId],
        to: colleagueId,
        method: method,
        request: message,
        cookie: cookie
    }, async())
})

Conference.prototype._broadcast = cadence(function (async, cancelable, method, message) {
    var cookie = this._cliffhanger.invoke(async())
    if (cancelable) {
        this._cancelable[cookie] = cancelable
    }
    var participantId = this._participantIds[this._colleague.colleagueId]
    var reductionKey = method + '/' + participantId + '/' + cookie
    this._broadcasts.hold(reductionKey, { cookie: cookie }).release()
    this._conduit.send(this._colleague.reinstatementId, {
        namespace: 'bigeasy.compassion.colleague.conference',
        type: 'broadcast',
        reductionKey: reductionKey,
        cookie: cookie,
        method: method,
        request: message
    }, async())
})

Conference.prototype._reduce = cadence(function (async, cancelable, method, converanceId, message) {
    var participantId = this._participantIds[this._colleague.colleagueId]
    var reductionKey = method + '/' + converanceId
    this._conduit.send({
        namespace: 'bigeasy.compassion.colleague.conference',
        type: 'converge',
        reductionKey: reductionKey,
        cookie: cookie,
        method: method,
        request: null,
        response: message
    }, async())
})

Conference.prototype._naturalized = cadence(function (async, responses, participantId) {
    assert(this._transtion == null || this._transition == participantId)
    this._transition = null
    if (this._immigrants[0] == participantId) {
        this._immigrants.shift()
    }
    if (this._colleague.participantId == participantId) {
        this._conduit.naturalized()
    }
    console.error('>>>', 'naturalized!', participantId)
    this._checkTransitions()
})

Conference.prototype._exiled = cadence(function (async, responses, participantId) {
// TODO Set `_transition` to `null` on collpase.
    assert(this._transtion == null || this._transition == participantId)
    this._transition = null
    this._immigrants = this._immigrants.filter(function (immigrantId) {
        return immigrantId == participantId
    })
    if (this._exiles[0].participantId == participantId) {
        this._exiles.shift()
    }
    delete this.properties[participantId]
    this._checkTransitions()
})

Conference.prototype._cancel = function () {
    this._cliffhanger.cancel(function (cookie) {
        return this._cancelable[cookie]
    })
    this._cancelable = {}
}

module.exports = Conference
