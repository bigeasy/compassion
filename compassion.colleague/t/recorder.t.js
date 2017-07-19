require('proof')(1, prove)

function prove (okay) {
    var Recorder = require('../recorder')
    var recorder = new Recorder('source', {
        info: function (message, entry) {
            okay({
                message: message,
                entry: entry
            }, {
                message: 'recorded',
                entry: {
                    source: 'source',
                    $envelope: {}
                }
            }, 'info')
        }
    })
    recorder.push({})
}
