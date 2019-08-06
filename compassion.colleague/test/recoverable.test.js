describe('recoverable', () => {
    const assert = require('assert')
    const recoverable = require('../recoverable')
    it('can retry on empty set', () => {
        assert.deepStrictEqual(recoverable('x', []), { action: 'retry' }, 'empty')
    })
    it('can retry on not found', () => {
        assert.deepStrictEqual(recoverable('x', [{
            id: 'a'
        }]), { action: 'retry' }, 'not found')
    })
    it('can become unrecoverable on a new republic', () => {
        assert.deepStrictEqual(recoverable('a', [{
            id: 'a',
            government: {
                republic: 1
            }
        }, {
            id: 'b',
            government: {
                republic: 2
            }
        }]), { action: 'unrecoverable', definitive: true }, 'superseded')
    })
    it('can become unrecoverable when the majority is missing', () => {
        assert.deepStrictEqual(recoverable('a', [{
            id: 'a',
            government: {
                republic: 1,
                promise: '2/1',
                majority: [ 'a', 'b' ],
                minority: [ 'c' ]
            }
        }, {
            id: 'x',
            government: {
                republic: 1,
                promise: '2/0'
            }
        }]), { action: 'unrecoverable', definitive: false }, 'majority missing')
    })
    it('can detect a recoverable consensus', () => {
        assert.deepStrictEqual(recoverable('a', [{
            id: 'a',
            government: {
                republic: 1,
                promise: '2/1',
                majority: [ 'a', 'b' ],
                minority: [ 'c' ]
            }
        }, {
            id: 'b',
            government: {
                republic: 1,
                promise: '2/0'
            }
        }]), { action: 'retry' }, 'recoverable')
    })
})
