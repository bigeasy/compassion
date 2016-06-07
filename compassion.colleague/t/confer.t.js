require('proof')(5, require('cadence')(prove))

function prove (async, assert) {
    var Conference = require('../confer')
    assert(Conference, 'require')
    var object = {
        'test': function () {
            assert(this === object, 'object this')
        }
    }
    var conference = new Conference({}, object)

    var specific = {
        'test': function () {
            assert(this === specific, 'specific object')
        }
    }

    conference._createOperation({ object: specific, method: 'test' }).apply([], [])
    conference._createOperation('test').apply([], [])

    conference.message({})

    async(function () {
        conference._enqueue({
            type: 'entry',
            promise: '1/0',
// TODO Add government flag to message.
            isGovernment: true,
            value: {
                government: {
                    majority: [ '0' ],
                    minority: [],
                    constituents: []
                },
                citizens: {
                    0: { immigrated: '1/0' }
                }
            }
        }, async())
    }, function () {
        assert(conference._participants, [ '1/0:0' ], 'participants')
        conference._enqueue({
            type: 'entry',
            promise: '2/0',
// TODO Add government flag to message.
            isGovernment: true,
            value: {
                government: {
                    majority: [ '0' ],
                    minority: [],
                    constituents: [ '1' ],
                    immigration: { id: '1' }
                },
                citizens: {
                    0: { immigrated: '1/0' },
                    1: { immigrated: '2/0' }
                }
            }
        }, async())
    }, function () {
        assert(conference._immigrants, [ '2/0:1' ], 'immigrants')
    })
}
