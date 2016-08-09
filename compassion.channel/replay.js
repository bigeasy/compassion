        if (program.ultimate.replay) {
            var fs = require('fs')
            var byline = require('byline')
            var player = colleague
            colleague.replay()
            var stream = fs.createReadStream(program.ultimate.replay)
            byline(stream).on('data', function (line) {
                if (/^{"/.test(line.toString())) {
                    colleague.play(JSON.parse(line.toString()))
                }
            })
            stream.on('end', function () { program.emit('SIGINT') })
        } else {
        }
