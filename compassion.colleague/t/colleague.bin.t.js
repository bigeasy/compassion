require('proof/redux')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = {
        conduit: require('compassion.conduit'),
        colleague: require('../colleague.bin')
    }, conduit, colleague
    async(function () {
        conduit = bin.conduit({ bind: '127.0.0.1:8888' }, {}, async())
    }, function () {
        colleague = bin.colleague([ {
            conduit: '127.0.0.1:8888',
            island: 'island',
            id: '1'
        }, [ './t/dummy' ] ], {}, async())
    }, function () {
        assert(true, 'started')
        colleague.emit('SIGINT')
    }, function () {
        conduit.emit('SIGINT')
    })
}
