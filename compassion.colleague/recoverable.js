var Monotonic  = require('monotonic').asString

module.exports =  function (id, members) {
    // Never mind.
    if (members.length == 0) {
        return { action: 'retry' }
    }

    // Find ourselves.
    var self = members.filter(function (member) {
        return member.id == id
    })

    // If we can't even reach ourselves, then let's hang on. No point in
    // restarting because we're not going to be able to join.
    if (self.length != 1) {
        return { action: 'retry' }
    }

    members.sort(function (a, b) {
        return b.government.republic - a.government.republic
    })

    var unsplit = members.filter(function (member) {
        return member.government.republic == members[0].government.republic
    })

    self = self.shift()

    // Our republic has been superseded. This one is definitive.
    if (members[0].government.republic != self.government.republic) {
        return { action: 'unrecoverable', definitive: true }
    }

    unsplit.sort(function (a, b) {
        return -Monotonic.compare(a.government.promise, b.government.promise)
    })

    var government = unsplit[0].government
    var ids = unsplit.map(function (member) { return member.id })

    if (government.majority.concat(government.minority).filter(function (id) {
        return !! ~ids.indexOf(id)
    }).length != government.majority.length) {
        return { action: 'unrecoverable', definitive: false }
    }

    return { action: 'retry' }
}
