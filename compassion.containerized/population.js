var cadence = require('cadence')

function Population (ua) {
    this._ua = ua
}

Population.prototype.census = cadence(function (async, instances, island) {
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

module.exports = Population
