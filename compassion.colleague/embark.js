const Paxos = require('paxos')

module.exports = function (members, republic) {
    const unsplit = members.filter(function (member) {
        return member.government.promise != '0/0' && member.government.republic == republic
    })

    // The entire island has disappeared.
    if (unsplit.length == 0) {
        return { action: 'unrecoverable' }
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
        return { action: 'unrecoverable' }
    }

    if (government.majority.filter(function (id) {
        return ~ids.indexOf(id)
    }).length == government.majority.length) {
        return { action: 'embark', url: government.properties[government.majority[0]].url }
    }

    return { action: 'retry' }
}
