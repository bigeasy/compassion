require('proof')(4, (okay) => {
    const embark = require('../embark')
    okay(embark([{
        id: 'x',
        government: {
            promise: '0/0',
            republic: 1
        }
    }], 1, true), {
        action: 'unrecoverable',
        definitive: true
    }, 'no members')
    okay(embark([{
        id: 'x',
        government: {
            promise: '0/0',
            republic: 1
        }
    }, {
        id: 'a',
        government: {
            republic: 1,
            promise: '6/0',
            majority: [ 'a', 'b' ],
            minority: [ 'c' ]
        }
    }], 1, false), {
        action: 'unrecoverable',
        definitive: false
    }, 'collapsed')
    okay(embark([{
        id: 'x',
        government: {
            promise: '0/0',
            republic: 1
        }
    }, {
        id: 'a',
        government: {
            republic: 1,
            promise: '6/0',
            majority: [ 'a', 'b' ],
            minority: [ 'c' ]
        }
    }, {
        id: 'c',
        government: {
            republic: 1,
            promise: '6/0',
            majority: [ 'a', 'b' ],
            minority: [ 'c' ]
        }
    }], 1), {
        action: 'retry'
    }, 'retry')
    okay(embark([{
        id: 'x',
        government: {
            promise: '0/0',
            republic: 1
        }
    }, {
        id: 'a',
        government: {
            republic: 1,
            promise: '7/1',
            majority: [ 'a', 'b' ],
            minority: [ 'c' ],
            properties: {
                a: { url: 'http://127.0.0.1:8080/' }
            }
        }
    }, {
        id: 'b',
        government: {
            republic: 1,
            promise: '7/0',
            majority: [ 'a', 'b' ],
            minority: [ 'c' ]
        }
    }], 1), {
        action: 'embark',
        url: 'http://127.0.0.1:8080/'
    }, 'embark')
})
