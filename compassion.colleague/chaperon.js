var cadence = require('cadence')

// A Chaperon client.
function Chaperon () {
    this._chaperon = options.chaperon
    this._kibitzer = options.kibitzer
    this._colleageId = options.colleagueId
    this._islandName = options.islandName
    this._startedAt = options.startedAt
}

Chaperon.prototype.listen = cadence(function (async) {
    var loop = async(function () {
        async(function () {
            this._ua.fetch({
                url: this._chaperon
            }, {
                url: '/action',
                post: {
                    colleagueId: this._colleagueId,
                    islandName: this._islandName,
                    islandId: this._kibitzer.legislator.islandId,
                    startedAt: this._startedAt
                },
                nullify: true
            })
        }, function (action) {
            if (this._stopped) {
                return [ loop.break ]
            }
            if (action == null) {
                this._checkChaperonIn(1000)
                return
            }
            switch (action.name) {
            case 'unstable':
            case 'unreachable':
                this._checkChaperonIn(1000)
                break
            case 'recoverable':
                this._checkChaperonIn(1000 * 60)
                break
            case 'bootstrap':
                this._kibitzer.legislator.naturalized = true
                this._kibitzer.bootstrap(this.startedAt)
                this._checkChaperonIn(1000)
                break
            case 'join':
                async(function () {
                    this._kibitzer.join(action.vargs[0], async())
                }, function (enqueued) {
                    this._checkChaperonIn(1000 * (enqueued ? 5 : 60))
                })
                break
            case 'splitBrain':
            case 'unrecoverable':
                this._kibizter.shutdown()
                this._stopped = true
                break
            }
        })
    })()
})

Chaperon.prototype._checkChaperonIn = function (delay) {
    delay += this._Date.now()
    this.scheduler.schedule(delay, 'checkChaperon', { object: this, method: '_annoyingFixMe' })
}

Chaperon.prototype._annoyingFixMe = function () {
    this.chaperon.check()
}

module.exports = Chaperon
