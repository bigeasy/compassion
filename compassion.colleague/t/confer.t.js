require('proof')(6, require('cadence')(prove))

function prove (async, assert) {
    var cadence = require('cadence')
    var Conference = require('../confer')
    assert(Conference, 'require')

    var wait
    var object = {
        test: function () {
            assert(this === object, 'object this')
        },
        join: cadence(function (async) {
            console.log('called')
            wait()
            return {}
        })
    }
    var conference = new Conference({}, object)

    var specific = {
        test: function () {
            assert(this === specific, 'specific object')
        }
    }

    conference._createOperation({ object: specific, method: 'test' }).apply([], [])
    conference._createOperation('test').apply([], [])

    conference.join('join')

    conference.message({})

    async(function () {
        conference._enqueue({
            type: 'reinstate',
            islandId: '0',
            reinstatementId: 0,
            colleagueId: '0'
        }, async())
    }, function () {
        wait = async()
        assert(conference._colleague, {
            islandId: '0',
            reinstatementId: 0,
            colleagueId: '0',
            participantId: null
        }, 'set colleague id')
        conference._enqueue({
            type: 'entry',
// TODO Add government flag to message.
            isGovernment: true,
            entry: {
                value: {
                    government: {
                        promise: '1/0',
                        majority: [ '0' ],
                        minority: [],
                        constituents: []
                    },
                    properties: {
                        0: { immigrated: '1/0' }
                    }
                }
            }
        }, async())
    }, function () {
        assert(conference._participants, { '1/0:0': { immigrated: '1/0' } }, 'participants')
        conference._enqueue({
            type: 'entry',
// TODO Add government flag to message.
            isGovernment: true,
            entry: {
                value: {
                    government: {
                        promise: '2/0',
                        majority: [ '0' ],
                        minority: [],
                        constituents: [ '1' ],
                        immigrate: { id: '1' }
                    },
                    properties: {
                        0: { immigrated: '1/0' },
                        1: { immigrated: '2/0' }
                    }
                }
            }
        }, async())
    }, function () {
        assert(conference._immigrants, [ '2/0:1' ], 'immigrants')
    })
}
