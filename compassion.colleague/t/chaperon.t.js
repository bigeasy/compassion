require('proof')(4, require('cadence')(prove))

function prove (async, assert) {
    var Kibitzer = require('kibitz')

    var Chaperon = require('../chaperon')
    assert(Chaperon, 'require')

    var chaperon = new Chaperon({
        kibitzer: new Kibitzer({ id: 'x' }),
        colleague: {
            getProperties: function (callback) { callback(null, {}) }
        }
    })

    async(function () {
        chaperon._action({ name: 'unstable' }, 1, async())
    }, function () {
        chaperon._action({ name: 'recoverable' }, 1, async())
    }, function () {
        chaperon._action({ name: 'bootstrap', url: { self: 'x' } }, 1, async())
    }, function () {
        chaperon._action({ name: 'splitBrain' }, null, async())
    }, function () {
        assert(chaperon.destroyed, 'self-destruct')
        chaperon.destroy()
        chaperon = new Chaperon({
            kibitzer: {
                join: function (leader, properties, callback) {
                    assert({
                        leader: leader,
                        properties: properties
                    }, {
                        leader: { url: 'y', republic: 1 },
                        properties: { url: 'x' }
                    }, 'joining')
                    callback(null, true)
                }
            },
            colleague: {
                getProperties: function (callback) { callback(null, {}) }
            }
        })
        chaperon._action({
            name: 'join',
            url: {
                self: 'x',
                leader: 'y'
            },
            republic: 1
        }, 1, async())
    }, function () {
        chaperon.destroy()
        chaperon = new Chaperon({
            kibitzer: {
                join: function (leader, properties, callback) {
                    assert({
                        leader: leader,
                        properties: properties
                    }, {
                        leader: { url: 'y', republic: 1 },
                        properties: { url: 'x' }
                    }, 'joining')
                    callback(null, false)
                }
            },
            colleague: {
                getProperties: function (callback) { callback(null, {}) }
            }
        })
        chaperon._action({
            name: 'join',
            url: {
                self: 'x',
                leader: 'y'
            },
            republic: 1
         }, 1, async())
    })
}
