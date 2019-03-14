var cadence = require('cadence')
var url = require('url')

function Population (resolver, ua) {
    this._resolver = resolver
    this._ua = ua
}

// We don't use `id` here, but we added it so we can use it in testing to get
// test coverage of the race conidtion where the colleague is destroyed while
// we're fetching the population.
Population.prototype.census = cadence(function (async, island, id) {
    async(function () {
        this._resolver.resolve(async())
    }, function (instances) {
        var complete = true
        async(function () {
            async.map([ instances ], function (location) {
                async(function () {
                    this._ua.fetch({
                        url: location
                    }, {
                        url: [ '.', 'island', island, 'islanders' ].join('/'),
                        parse: 'json',
                        nullify: true
                    }, async())
                }, function (body, response) {
                    if (body == null) {
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
            })
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
