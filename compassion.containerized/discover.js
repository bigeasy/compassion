var Monotonic  = require('monotonic').asString
var coalesce = require('extant')

module.exports =  function (id, members, complete) {
    // Never mind.
    if (members.length == 0) {
        return { action: 'retry' }
    }

    // Find ourselves.
    var self = members.filter(function (member) {
        return member.id == id
    })

    // If we cannot reach ourselves, let's not bother.
    if (self.length != 1) {
        return { action: 'retry' }
    }

    members.sort(function (a, b) {
        return coalesce(b.government.republic, 0) - coalesce(a.government.republic, 0)
    })

    if (members[0].government.republic == null) {
        console.log('no no bad')
        if (!complete) {
            return { action: 'retry' }
        }
        self = self.shift()
        members.sort(function (a, b) {
            return a.cookie - b.cookie
        })

        if (self.cookie == members[0].cookie) {
            return { action: 'bootstrap', url: self.url, republic: self.cookie  }
        }
        return { action: 'retry' }
    }

    var unsplit = members.filter(function (member) {
        return member.government.republic == members[0].government.republic
    })

    unsplit.sort(function (a, b) {
        return -Monotonic.compare(a.government.promise, b.government.promise)
    })

    var government = unsplit[0].government
    var ids = unsplit.map(function (member) { return member.id })

    var synod = government.majority.concat(government.minority)

    if (synod.filter(function (id) {
        return !! ~ids.indexOf(id)
    }).length != synod.length) {
        return { action: 'retry' }
    }

    self = self.shift()

    return {
        action: 'join',
        self: self.url,
        republic: members[0].government.republic
    }
}
