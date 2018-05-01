var cadence = require('cadence')

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
            async.map(function (url) {
                this._ua.fetch({
                    url: url
                }, {
                    url: [ '.', 'island', island, 'islanders' ].join('/')
                }, async())
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
