var abend = require('abend')

var assert = require('assert')
var recover = require('recover')
var interrupt = require('interrupt').createInterrupter('bigeasy.compassion.confer')

var cadence = require('cadence')

var RBTree = require('bintrees').RBTree
var Operation = require('operation')
var Reactor = require('reactor')

function Conference (conduit, self) {
    this._conduit = conduit
    this._self = self || null
    this._participants = []
    this._colleagueId = null
    this._participantIds = null
    this._immigrants = []
    this._operations = {}
    this._operating = new Reactor({ object: this, method: '_operate' })
    this._messages = new Reactor({ object: this, method: '_message' })
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
    assert(!this._operations[key], 'operation already assinged')
    this._operations[key] = this._createOperation(operation)
}

Conference.prototype._getOperation = function (qualifier, name) {
    return this._operations[qualifier + ':' + name]
}

Conference.prototype.join = function (operation) {
    this._setOperation('internal', 'join', operation)
}

Conference.prototype.naturalize = function () {
    assert(this._naturalizing != null, 'nothing is naturalizing')
    if (this.colleagueId == this._naturalizing.colleagueId) {
        this.conduit.naturalize()
    }
    delete this._naturalizing[colleagueId]
}

Conference.prototype._check = cadence(function (async, timeout) {
    if (this._isLeader) {
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
Conference.prototype._operate = cadence(function (async, timeout, message) {
    async(recover(function () {
        var operation = this._getOperation(message.qualifier, message.method)
        if (operation == null) {
            return
        }
        operation.apply([], message.vargs.concat(async()))
    }, /^interrupt:bigeasy.compassion.colleage.confer:cancelled$/, function () {
        return [ async.break ]
    }))
})

Conference.prototype._message = cadence(function (async, timeout, message) {
    if (message.type == 'reinstate') {
        this._colleagueId = message.colleagueId
    } else if (message.isGovernment) {
        var value = message.value

        this._participantIds = {}
        value
            .government
            .majority.concat(value.government.minority)
            .concat(value.government.constituents)
            .forEach(function (id) {
                this._participantIds[id] = value.citizens[id].immigrated + ':' + id
            }, this)

        // Send a collapse message either here or from conduit.
        if (value.collapsed) {
            this._broadcasts.clear()
            this._naturalizing = {}
            this._exiling = {}
        } else if (message.promise == '1/0') {
            var leader = value.government.majority[0]
            this._participants.push(this._participantIds[leader])
            this._isLeader = true
            this._operating.push({ qualifier: 'internal', method: 'join', vargs: [] })
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
            if (this._participants.indexOf(exile) != -1) {
                this._exiles.push({ colleagueId: exile })
            }
        }

        // Order matters. Citizens must be naturalized in the same order in
        // which they immigrated. If not, one citizen might be made leader and
        // not know of another citizens immigration.
        var immigration = value.government.immigration
        if (immigration) {
// TODO Add immigrated to citizen properties
// TODO Put id in this object.
            this._immigrants.push(this._participantIds[immigration.id])
        }

        if (message.namespace != 'bigeasy.compassion.confer') {
            return
        }

    } else {
    }
})

Conference.prototype.message = function (message) {
    this._enqueue(message, abend)
}

Conference.prototype._enqueue = function (message, callback) {
    switch (message.type) {
    case 'reinstate':
        this._messages.push(message, callback)
        break
    case 'entry':
        if (message.isGovernment || message.entry.value.namespace == 'bigeasy.compassion.confer') {
            this._messages.push(message, callback)
        }
        break
    }
}

module.exports = Conference
