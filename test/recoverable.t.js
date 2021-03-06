require('proof')(5, (okay) => {
    const recoverable = require('../recoverable')
    {
        okay(recoverable('x', []), { action: 'retry' }, 'empty')
    }
    {
        okay(recoverable('x', [{
            id: 'a'
        }]), { action: 'retry' }, 'not found')
    }
    {
        okay(recoverable('a', [{
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
    }
    {
        okay(recoverable('a', [{
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
    }
    {
        okay(recoverable('a', [{
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
    }
})
