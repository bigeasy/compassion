var Monotonic  = require('monotonic').asString

module.exports =  function (id, members, complete) {
    // Never mind.
    if (members.length == 0) {
        return null
    }

    // Find ourselves.
    var self = members.filter(function (member) {
        return member.id == id
    })

    // If we cannot reach ourselves, let's not bother.
    if (self.length != 1) {
        return null
    }

    members.sort(function (a, b) {
        return b.republic - a.republic
    })

    if (members[0].republic == 0) {
        if (!complete) {
            return null
        }
        self = self.shift()
        members.sort(function (a, b) {
            return a.cookie - b.cookie
        })

        if (self.cookie == members[0].cookie) {
            return { action: 'bootstrap', url: self.url, republic: self.cookie  }
        }
        return null
    }

    var unsplit = members.filter(function (member) {
        return member.republic == members[0].republic
    })

    unsplit.sort(function (a, b) {
        return -Monotonic.compare(a.government.promise, b.government.promise)
    })

    var government = unsplit[0].government
    var ids = unsplit.map(function (member) { return member.id })

    if (government.majority.filter(function (id) {
        return !! ~ids.indexOf(id)
    }).length != government.majority.length) {
        return null
    }

    self = self.shift()

    return {
        action: 'join',
        self: self.url,
        republic: members[0].republic
    }
}
