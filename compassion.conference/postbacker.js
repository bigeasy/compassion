var cadence = require('cadence')
var UserAgent = require('vizsla')
var interrupt = require('interrupt').createInterrupter('compassion.conference')

function PostBacker () {
    this._ua = new UserAgent
}

PostBacker.prototype.postback = cadence(function (async, path, postbacks, url, envelope) {
    var search = path.slice()
    while (search.length != 0) {
        postbacks = postbacks[search.shift()]
    }
    if (postbacks) {
        async([function () {
            this._ua.fetch({
                url: url
            }, {
                url: path.join('/'),
                post: envelope,
                timeout: 5000,
                parse: 'json',
                raise: true
            }, async())
        }, function (error) {
            throw interrupt('postback', error)
        }])
    } else {
        return null
    }
})

module.exports = cadence(function (async, destructible) {
    var postbacker = new PostBacker
    return postbacker
})
