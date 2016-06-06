require('proof')(3, prove)

function prove (assert) {
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
}
