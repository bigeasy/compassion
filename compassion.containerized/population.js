var Vizsla = require('vizsla')

function Population (ua) {
    this._ua = new Vizsla
}

Population.prototype.census = cadence(function (async, instances, island) {
    async(function () {
        async.map(function (url) {
            this._ua.fetch({
                url: url
            }, {
                url: [ '.', islanders, island ].join('/'),
                gateways: [ nullify(), jsonify(), nullify() ]
            }, async())
        })(instances)
    }, function () {
    })
})

module.exports = Population
