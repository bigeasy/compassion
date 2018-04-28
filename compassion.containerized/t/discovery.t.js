require('proof')(7, prove)

function prove (okay) {
    var discovery = require('../discovery')
    okay(discovery('a', [], true), null, 'empty')
    okay(discovery('a', [{ id: 'x' }], true), null, 'not found')
    okay(discovery('a', [{ id: 'a', republic: 0 }], false), null, 'bootstrap incomplete')
    okay(discovery('a', [{
        id: 'a', republic: 0, cookie: 2,
    }, {
        id: 'b', republic: 0, cookie: 1
    }], true), null, 'bootstrap not earliest')
    okay(discovery('a', [{
        id: 'a', republic: 0, cookie: 1, url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b', republic: 0, cookie: 2
    }], true), {
        action: 'bootstrap',
        url: 'http://127.0.0.1:8888/',
        republic: 1
    }, 'bootstrap')
    okay(discovery('a', [{
        id: 'a', republic: 0, cookie: 1, url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b',
        republic: 1,
        collapsed: true,
        government: {
            promise: '2/0',
            majority: [ 'b', 'c' ]
        }
    }], true), null, 'join collapsed')
    okay(discovery('a', [{
        id: 'a',
        republic: 0,
        cookie: 1,
        url: 'http://127.0.0.1:8888/'
    }, {
        id: 'b',
        republic: 1,
        government: {
            promise: '2/0',
            majority: [ 'b', 'c' ],
            properties: { b: { url: 'http://127.0.0.1:8081/' } }
        }
    }, {
        id: 'c',
        republic: 1,
        government: {
            promise: '1/0'
        }
    }], true), {
        action: 'join',
        self: 'http://127.0.0.1:8888/',
        republic: 1
    }, 'join')
}
