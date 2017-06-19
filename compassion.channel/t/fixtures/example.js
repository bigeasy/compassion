require('arguable')(module, require('cadence')(function (async, program) {
    var Conference = require('conference')
    var conference = new Conference({}, function (constructor) {})
    var Colleague = require('colleague')
    var colleague = new Colleague(conference)
    var abend = require('abend')
    colleague.listen(program, abend)
}))
