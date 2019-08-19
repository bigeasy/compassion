describe('embark', () => {
    const assert = require('assert')
    const embark = require('../embark')
    it('can mark unrecoverable when there are no members', () => {
        assert.deepStrictEqual(embark([{
            id: 'x',
            government: {
                promise: '0/0',
                republic: 1
            }
        }], 1), {
            action: 'unrecoverable'
        }, 'no members')
    })

    it('can detect collapse', () => {
        assert.deepStrictEqual(embark([{
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
        }], 1), {
            action: 'unrecoverable'
        }, 'collapsed')
    })

    it('can detect retry', () => {
        assert.deepStrictEqual(embark([{
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
    })

    it('can specify when and where to embark', () => {
        assert.deepStrictEqual(embark([{
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
})
