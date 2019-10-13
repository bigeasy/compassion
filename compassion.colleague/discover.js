const Paxos  = require('paxos')
const coalesce = require('extant')

module.exports =  function (id, members, complete) {
    // Never mind.
    if (members.length == 0) {
        return { action: 'retry' }
    }

    // Find ourselves.
    const selves = members.filter(function (member) {
        return member.id == id
    })

    // If we cannot reach ourselves, let's not bother.
    if (selves.length != 1) {
        return { action: 'retry' }
    }

    members.sort(function (a, b) {
        return coalesce(b.government.republic, 0) - coalesce(a.government.republic, 0)
    })

    if (members[0].government.republic == null) {
        if (!complete) {
            return { action: 'retry' }
        }
        const self = selves.shift()
        members.sort(function (a, b) {
            return a.createdAt - b.createdAt
        })

        if (self.createdAt == members[0].createdAt) {
            return { action: 'bootstrap', url: self.url  }
        }
        return { action: 'retry' }
    }

    const unsplit = members.filter(function (member) {
        return member.government.republic == members[0].government.republic
    })

    unsplit.sort(function (a, b) {
        return -Paxos.compare(a.government.promise, b.government.promise)
    })

    const government = unsplit[0].government
    const ids = unsplit.map(function (member) { return member.id })

    const synod = government.majority.concat(government.minority)

    if (synod.filter(function (id) {
        return !! ~ids.indexOf(id)
    }).length != synod.length) {
        return { action: 'retry' }
    }

    const self = selves.shift()

    return {
        action: 'join',
        url: self.url,
        republic: members[0].government.republic
    }
}
