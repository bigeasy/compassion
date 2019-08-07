describe('discover', () => {
    const assert = require('assert')
    const discover = require('../discover')
    it('can retry on empty', () => {
        assert.deepStrictEqual(discover('a', [], true), { action: 'retry' }, 'empty')
    })
    it('can retry on missing', () => {
        assert.deepStrictEqual(discover('a', [{ id: 'x' }], true), { action: 'retry' }, 'not found')
    })
    it('can retry possible bootstrap on incomplete census', () => {
        assert.deepStrictEqual(discover('a', [{
            id: 'a',
            government: { republic: null }
        }], false), { action: 'retry' }, 'bootstrap incomplete')
    })
    it('can retry on bootstrap not earliest', () => {
        assert.deepStrictEqual(discover('a', [{
            id: 'a', government: { republic: null }, createdAt: 2,
        }, {
            id: 'b', government: { republic: null }, createdAt: 1
        }], true), { action: 'retry' }, 'bootstrap not earliest')
    })
    it('can determine bootstrap', () => {
        assert.deepStrictEqual(discover('a', [{
            id: 'a', government: { republic: null }, createdAt: 1, url: 'http://127.0.0.1:8888/'
        }, {
            id: 'b', government: { republic: null }, createdAt: 2
        }], true), {
            action: 'bootstrap',
            url: 'http://127.0.0.1:8888/'
        }, 'bootstrap')
    })
    it('can retry on collapsed government', () => {
        assert.deepStrictEqual(discover('a', [{
            id: 'a',
            government: { republic: null },
            createdAt: 1,
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
    })
    it('can determine join', () => {
        assert.deepStrictEqual(discover('a', [{
            id: 'a',
            government: { republic: null },
            createdAt: 1,
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
            url: 'http://127.0.0.1:8888/',
            republic: 1
        }, 'join')
    })
})
