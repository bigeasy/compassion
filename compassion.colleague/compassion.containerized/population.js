var cadence = require('cadence')
var url = require('url')

function Population (resolver, ua) {
    this._resolver = resolver
    this._ua = ua
}

Population.prototype.census = cadence(function (async, island) {
    async(function () {
        this._resolver.resolve(async())
    }, function (instances) {
        var complete = true
        async(function () {
            async.map(function (location) {
                async(function () {
                    this._ua.fetch({
                        url: location
                    }, {
                        url: [ '.', 'island', island, 'islanders' ].join('/')
                    }, async())
                }, function (body, response) {
                    if (!body) {
                        return null
                    }
                    return [ body.map(function (member) {
                        var path = [ '.', 'island', island, 'islander', member.id, ''].join('/')
                        return {
                            id: member.id,
                            government: member.government,
                            cookie: member.cookie,
                            url: url.resolve(location, path)
                        }
                    }) ]
                })
            })(instances)
        }, function (results) {
            var members = []
            while (results.length) {
                if (results[0] == null) {
                    complete = false
                } else {
                    while (results[0].length) {
                        members.push(results[0].shift())
                    }
                }
                results.shift()
            }
            return [ members, complete ]
        })
    })
})

module.exports = Population
