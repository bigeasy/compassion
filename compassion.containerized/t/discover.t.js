require('proof')(7, prove)

function prove (okay) {
    var discover = require('../discover')
    okay(discover('a', [], true), { action: 'retry' }, 'empty')
    okay(discover('a', [{ id: 'x' }], true), { action: 'retry' }, 'not found')
    okay(discover('a', [{ id: 'a', government: { republic: null } }], false), { action: 'retry' }, 'bootstrap incomplete')
    okay(discover('a', [{
        id: 'a', government: { republic: null }, cookie: 2,
    }, {
        id: 'b', government: { republic: null }, cookie: 1
    }], true), { action: 'retry' }, 'bootstrap not earliest')
    okay(discover('a', [{
        id: 'a', government: { republic: null }, cookie: 1, url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b', government: { republic: null }, cookie: 2
    }], true), {
        action: 'bootstrap',
        url: 'http://127.0.0.1:8888/',
        republic: 1
    }, 'bootstrap')
    okay(discover('a', [{
        id: 'a',
        government: { republic: null },
        cookie: 1,
        url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b',
        collapsed: true,
        government: {
            republic: 1,
            promise: '2/0',
            majority: [ 'b', 'c' ]
        }
    }], true), { action: 'retry' }, 'join collapsed')
    okay(discover('a', [{
        id: 'a',
        government: { republic: null },
        cookie: 1,
        url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b',
        government: {
            republic: 1,
            promise: '2/0',
            majority: [ 'b', 'c' ],
            minority: [],
            properties: { b: { url: 'http://127.0.0.1:8081/' } }
        }
    }, {
        id: 'c',
        government: {
            republic: 1,
            promise: '1/0'
        }
    }], true), {
        action: 'join',
        self: 'http://127.0.0.1:8888/',
        republic: 1
    }, 'join')
}
