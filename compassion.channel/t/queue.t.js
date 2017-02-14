require('proof')(1, prove)

function prove (assert) {
    var Queue = require('../queue')
    var log = [], sink = []
    var queue = new Queue(log, sink)
    queue.push(1)
    assert({
        log: log,
        sink: sink
    }, {
        log: [{
            module: 'compassion.channel',
            method: 'log',
            body: 1
        }],
        sink: [ 1 ]
    }, 'pushed')
}
