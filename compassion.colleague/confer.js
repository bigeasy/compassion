var abend = require('abend')

var assert = require('assert')

var cadence = require('cadence')

var RBTree = require('bintrees').RBTree
var Operation = require('operation')
var Reactor = require('reactor')

function Conference (conduit, self) {
    this._conduit = conduit
    this._self = self || null
    this._particpants = []
    this._immigrants = []
    this._operations = {}
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

Conference.prototype._message = cadence(function (async, timeout, message) {
    if (message.isGovernment) {
        var value = message.value
        if (value.collapsed) {
            this._broadcasts.clear()
            this._naturalizing = {}
            this._exiling = {}
        } else if (message.promise == '1/0') {
            this._apply('internal', 'join', [ true ], async())
            var leader = value.government.majority[0]
            this._particpants.push(value.citizens[leader].immigrated + ':' + leader)
            this._isLeader = true
            return
        }

        // TODO For now I don't care about the order in which they where
        // naturalized, ah, yes, I do, because I wanted to use that to generate
        // a very unique id, even more unique that usual, maybe twice as unique.

        // Create a list of citizens, but with a unique key that combines the
        // colleague id the promise with which the colleague immigrated.

        var citizens = value.government
                            .majority.concat(value.government.minority)
                            .concat(value.government.constituents)
                            .map(function (id) {
                                return value.citizens[id].immigrated + ':' + id
                            })

        // Alternate unique id is the identifer plus the promise of the
        // government that introduced it and then clocks don't matter.

        // Diff exiles from participants.
        /*
        this._particpants.filter(function (participant) {
            return citizens.indexOf(participant) == -1
        }).forEach(function (exile) {
        }, this)
        */

        // TODO Exile needs to be an object that has the final state. Hmm... No,
        // I believe I left the citizen in there.
        var exile = value.government.exile
        if (exile) {
            exile = exile + ':' + government.citizens[exile].immigrated
            // Remove from the list of naturalizations if it is in there.
            this._immigrants = this._immigrants.filter(function (immigrant) {
                return immigrant != exile
            })
            // If naturalization was in progress, then cancel it, skip exile.
            var consensus = this._consensus.find({ type: 'naturalization', topic: exile })
            if (consensus) {
                consensus.cancel()
            }
            if (this._particpants.indexOf(exile) != -1) {
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
            immigration = value.citizens[immigration.id].immigrated + ':' + immigration.id
            this._immigrants.push(immigration)
        }

        // Some notes that belong somewhere else.

        // The split between naturalization and immigration doesn't mean we wait
        // for a participant to naturalize before it can be used within the
        // application, only that it must naturalize before it can become a
        // member of the government. This eliminates any concerns that our
        // leader would assume leadership without the application state. This
        // addition of eventual naturalization bought a lot and simplified
        // reasonsing about initalization.

        // Can even sort out back channel synchronization, but we need to still
        // take advantage of the ability to replay. Leader connects directly to
        // immigrant, marks the version of the database in the log, streams
        // state then tells the log to resume for the participant. There can be
        // a maximum log length held by participant. Pause is a message that
        // causes the participants kibitzer to pause the log, scanning it for
        // when to resume the log.

        // We could track the exiles and then remove the tracking when they
        // become real according to Misnomer. But, this doesn't work because
        // that history does not exist.

        // Which introduces a race condition where we may recover from a near
        // fatal collapse, but

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
    case 'entry':
        if (message.isGovernment || message.entry.value.namespace == 'bigeasy.compassion.confer') {
            this._messages.push(message, callback)
        }
        break
    }
}

Conference.prototype.register = function (registration) {
    this._registrations[registration.name] = registration
}

Conference.prototype.initiate = function () {
}

module.exports = Conference
