require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('..')
    var stream = require('stream')
    async(function () {
        bin([ '--id', 'third' ], {
            $trap: false,
            $stdin: new stream.PassThrough
        }, async())
    }, function (child) {
        async(function () {
            child.exit(async())
            child.destroy()
        }, function (exitCode) {
            okay(exitCode, 0, 'exit')
        })
    })
}
