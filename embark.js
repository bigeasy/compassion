const Paxos = require('paxos')

// **TODO** If you read, we're not basing definitive on complete, so either we
// completely trust our inventory, or we introduce some sort of mechanism to
// timeout. I believe we should modify our inventory to return an empty list if
// it is itself indecisive, which it may be in the case of Gossip and SWIM, but
// it should be authoritive in the case of case of using a hosting service API.
module.exports = function (members, republic, complete) {
    const unsplit = members.filter(function (member) {
        return member.government.promise != '0/0' && member.government.republic == republic
    })

    // The entire island has disappeared.
    if (unsplit.length == 0) {
        return { action: 'unrecoverable', definitive: complete }
    }

    unsplit.sort(function (a, b) {
        return -Paxos.compare(a.government.promise, b.government.promise)
    })

    const government = unsplit[0].government

    const ids = unsplit.map(function (member) { return member.id })

    // Cannot find a quorum, unrecoverable.
    if (government.majority.concat(government.minority).filter(function (id) {
        return ~ids.indexOf(id)
    }).length < government.majority.length) {
        return { action: 'unrecoverable', definitive: complete }
    }

    if (government.majority.filter(function (id) {
        return ~ids.indexOf(id)
    }).length == government.majority.length) {
        return { action: 'embark', url: government.properties[government.majority[0]].url }
    }

    return { action: 'retry' }
}
