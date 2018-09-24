require('proof')(1, prove)

function prove (okay) {
    var Canary = require('..')
    okay(Canary, 'required')
}
