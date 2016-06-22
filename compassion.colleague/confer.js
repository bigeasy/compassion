var abend = require('abend')

var assert = require('assert')
var recover = require('recover')

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
    this._participants = {}
    this._colleagueId = null
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

Conference.prototype._check = cadence(function (async, timeout) {
    if (this.isLeader) {
        if (this._exiles.length) {
            if (!this._exiles[0].exiling) {
                this.conduit.publish({ type: 'exile' }, async())
            }
        } else if (this._immigrants.length) {
        }
    }
})

Conference.prototype._apply = cadence(function (async, qualifier, name, vargs) {
    var operation = this._operations[qualifier + '.' + name]
    if (operation) {
        operation.apply([], vargs.concact(async()))
    }
})

// TODO Should this be parallel with how ever many turnstiles?
Conference.prototype._operate = cadence(function (async, message) {
    async(recover(function () {
        var operation = this._getOperation(message.qualifier, message.method)
        if (operation == null) {
            return null
        }
        operation.apply([], message.vargs.concat(async()))
    }, /^compassion.colleage.confer#cancelled$/m, function () {
        return [ async.break ]
    }))
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

        this._participantIds = {}
        value
            .government
            .majority.concat(value.government.minority)
            .concat(value.government.constituents)
            .forEach(function (id) {
                this._participantIds[id] = value.properties[id].immigrated + ':' + id
            }, this)
// TODO Losing sight of why I need these special aggregate ids.


        this._colleague.participantId = this._participantIds[this._colleague.colleagueId]

        // Send a collapse message either here or from conduit.
        if (value.collapsed) {
            this._broadcasts.clear()
            this._naturalizing = {}
            this._exiling = {}
        } else if (value.government.promise == '1/0') {

            var leader = value.government.majority[0]
// TODO What is all this?
// TODO Come back and think hard about about rejoining.
            this._participants[this._participantIds[leader]] = value.properties[leader]
            this.isLeader = true
            this._operate({ qualifier: 'internal', method: 'join', vargs: [
                true, this._colleague, value.properties[leader]
            ] }, abend)
            return
        }

        // TODO Exile needs to be an object that has the final state. Hmm... No,
        // I believe I left the citizen in there.
        var exile = value.government.exile
        if (exile) {
            exile = this._participantIds[exile]
            // Remove from the list of naturalizations if it is in there.
            this._immigrants = this._immigrants.filter(function (immigrant) {
                return immigrant != exile
            })
            // If naturalization was in progress, then cancel it, skip exile.
            var consensus = this._consensus.find({ type: 'naturalization', topic: exile })
            if (consensus) {
                consensus.cancel()
            }
            if (this._participants[exile] != null) {
                this._exiles.push({ colleagueId: exile })
            }
        }

        // Order matters. Citizens must be naturalized in the same order in
        // which they immigrated. If not, one citizen might be made leader and
        // not know of another citizens immigration.
        var immigration = value.government.immigrate
        if (immigration) {
// TODO Add immigrated to citizen properties
// TODO Put id in this object.
            this._immigrants.push(this._participantIds[immigration.id])
            this._participants[this._participantIds[immigration.id]] = value.properties[immigration.id]
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
    if (this.isLeader && this._transition == null) {
        if (this._exiles.length != 0) {
            this._transition = 'exile'
            this._operate({ qualifier: 'internal', method: 'exile', vargs: [] }, abend)
        } else if (this._immigrants.length != 0) {
            this._transition = 'naturalize'
            this._operate({
                qualifier: 'internal',
                method: 'immigrate',
                vargs: [ this._immigrants[0], this._participants[this._immigrants[0]] ]
            }, abend)
        }
    }
})

Conference.prototype.send = cadence(function (async, method, colleagueId, message) {
    this._send(false, '.' + method, colleagueId, message, async())
})

Conference.prototype.broadcast = cadence(function (async, method, colleagueId, message) {
    this._broadcast(false, '.' + method, colleagueId, message, async())
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
    assert(this._immigrants[0] == participantId)
    this._transition = null
    this._immigrants.shift()
    if (this._colleague.participantId == participantId) {
        this._conduit.naturalized()
    }
})

Conference.prototype._cancel = function () {
    this._cliffhanger.cancel(function (cookie) {
        return this._cancelable[cookie]
    })
    this._cancelable = {}
}

module.exports = Conference
