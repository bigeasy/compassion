var cadence = require('cadence')
var events = require('events')
var Kibitzer = require('kibitz')
var url = require('url')
var abend = require('abend')
var Scheduler = require('happenstance')
var Reactor = require('reactor')
var WebSocket = require('ws')
var logger = require('prolific.logger').createLogger('compassion.colleague')
var assert = require('assert')
var events = require('events')
var util = require('util')

function Colleague (options) {
    this.kibitzer = null
    this._outOfBandNumber = 0
    this._chaperon = options.chaperon
    this._requests = new Reactor({ object: this, method: '_request' })
    this.chaperon = new Reactor({ object: this, method: '_checkChaperon' })
    this._requests.turnstile.health.turnstiles = 24
    this.messages = new events.EventEmitter
    this.colleagueId = options.colleagueId
    this.islandName = options.islandName
    this._timeout = options.timeout
    this._ping = options.ping
    this._recording = null
    this.startedAt = Date.now()
    this.properties = options.properties
    this._ua = options.ua
    this._Date = options.Date || Date
    this.scheduler = new Scheduler({ Date: this._Date })
    var properties = options.properties || {}
    properties.location = options.conduit
    properties.colleagueId = options.colleagueId
    properties.islandName = options.islandName
    this.kibitzer = new Kibitzer({
        kibitzerId: options.colleagueId,
        ua: options.ua,
        Date: this._Date,
        properties: properties,
        timeout: options.timeout,
        ping: options.ping,
        timerless: options.timerless,
        replaying: options.replaying
    })
    this.replaying = options.replaying
}

Colleague.prototype._setConsumer =  function (consumer, properties) {
    this._consumer = consumer
    for (var propertyName in properties) {
        this.kibitzer.properties[propertyName] = properties[propertyName]
    }
    this.kibitzer.on('enqueued', consumer.enqueued.bind(consumer))
}

Colleague.prototype.shutdown = function () {
    this.scheduler.shutdown()
    this.kibitzer.shutdown()
}

Colleague.prototype.record = function (name, message) {
    logger.info('record', { recording: { name: name, message: message } })
    this._consumer.replay(name, message)
}

Colleague.prototype.replay = function (entry) {
    if (entry.qualified == 'compassion.colleague#record') {
        this._consumer.replay(entry.recording.name, entry.recording.message)
    } else {
        this.kibitzer.replay()
    }
}

// TODO Break this up somehow, really crufty.
Colleague.prototype.play = cadence(function (async, entry, machine) {
    if (entry.qualifier == 'compassion.colleague' && entry.level == 'trace') {
        switch (entry.name) {
        case 'bootstrap':
            logger.trace('bootstrap', { request: entry.request, cookie: entry.cookie })
            this._createKibitzer(entry.request, entry.cookie, true, true)
            this.kibitzer.replay()
            break
        case 'join':
            logger.trace('join', { request: entry.request, cookie: entry.cookie })
            this._createKibitzer(entry.request, entry.cookie, true, false)
            this.kibitzer.replay()
            break
        case 'publish':
            break
            try {
                assert.deepEqual(this._recording[0], {
                    entry: entry.entry
                })
                this._recording.shift()
            } catch (e) {
                console.log('r', this._recording[0] && this._recording[0].entry)
                console.log('l', entry.entry)
            }
            break
        }
    } else if (this.kibitzer != null) {
        this.kibitzer.play(entry)
    }
    machine.replay(entry)
})

// Query a helper process that will look at the events in the meta. This is
// bootstrappy and not meant to be a replacement for Paxos, but we've got to
// start somewhere. This is not a part of the upstream libraries because this
// strategy for bootstrapping is specific to Chaperon.
Colleague.prototype._checkChaperon = cadence(function (async) {
    async(function () {
        this._ua._ua.fetch({ // TODO `_ua._ua` is horrible.
            url: this._chaperon
        }, {
            url: '/action',
            post: {
                colleagueId: this.colleagueId,
                islandName: this.islandName,
                islandId: this.kibitzer.legislator.islandId,
                startedAt: this.startedAt
            },
            nullify: true
        }, async())
    }, function (action) {
        console.log('>', action)
        if (action == null) {
            this.checkChaperonIn(1000)
            return
        }
        switch (action.name) {
        case 'unstable':
        case 'unreachable':
            this.checkChaperonIn(1000)
            break
        case 'recoverable':
            this.checkChaperonIn(1000 * 60)
            break
        case 'bootstrap':
            this.kibitzer.legislator.naturalized = true
            this.kibitzer.bootstrap(this.startedAt)
            this.checkChaperonIn(1000)
            break
        case 'join':
            async(function () {
                this.kibitzer.join(action.vargs[0], async())
            }, function (enqueued) {
                this.checkChaperonIn(1000 * (enqueued ? 5 : 60))
            })
            break
        case 'splitBrain':
        case 'unrecoverable':
            this.kibizter.shutdown()
            break
        }
    })
})

Colleague.prototype.checkChaperonIn = function (delay) {
    delay += this._Date.now()
    this.scheduler.schedule(delay, 'checkChaperon', { object: this, method: '_annoyingFixMe' })
}

Colleague.prototype._annoyingFixMe = function () {
    this.chaperon.check()
}

Colleague.prototype.kibitz = cadence(function (async, request) {
    if (this.kibitzer == null) {
        return [ null ]
    }
    this.kibitzer.dispatch(request.kibitz, async())
})

Colleague.prototype.publish = cadence(function (async, entry) {
    logger.trace('publish', { entry: entry })
    if (this._recording == null) {
        this.kibitzer.publish(entry)
    } else {
        this._recording.push({ entry: entry })
    }
    return []
})

Colleague.prototype.oob = cadence(function (async, body) {
    logger.trace('oob', { body: body })
    this._consumer.oob(body.name, body.post, async())
})

// Any error is going to crash. No retry. We are going to ask the current
// leader. If the leader is not there or responds with any sort of error code,
// we crash. Out-of-band data is supposed to be used to abtain a mirror of an
// initial state, probably through an atomic immigration entry processor, so if
// the leader is unresponsive, and the government has changed, we're not going
// to be able to wait until things get better. We can't process the log until
// we're initialized. Deadlock. Crash and start over.
//
// The leader doesn't necessarily need to be the leader. That is application
// dependant. It only needs to have the state information necessary to
// initialize the new participant. Unless the application developer wants us to
// crash, we're not going to crash if leadership changes, only if the leader at
// the time of immigration has gone away or is unable to respond.
Colleague.prototype.outOfBand = cadence(function (async, name, post) {
    var outOfBandNumber = this._outOfBandNumber++
    logger.trace('outOfBandCall', {
        message: {
            name: name, post: post, invocation: outOfBandNumber
        }
   })
    var leaderId = this.kibitzer.legislator.government.majority[0]
    var properties = this.kibitzer.legislator.properties[leaderId]
    var url = util.format('http://%s/oob', properties.location)
    async(function () {
        this._ua._ua.fetch({
            url: url,
            post: {
                islandName: this.islandName,
                islandId: this.islandId,
                colleagueId: leaderId,
                name: name,
                post: post
            },
            raise: true
        }, async())
    }, function (result) {
        logger.trace('outOfBandReturn', { invocation: outOfBandNumber, result: result })
        return [ result ]
    })
})

Colleague.prototype.naturalized = function () {
    this.kibitzer.legislator.naturalize()
}

Colleague.prototype.health = cadence(function (async) {
    return {
        startedAt: this.startedAt,
        requests: this._requests.turnstile.health,
        islandName: this.islandName,
        colleagueId: this.colleagueId,
        islandId: this.kibitzer.legislator.islandId,
        government: this.kibitzer.legislator.government
    }
})

Colleague.prototype.request = cadence(function (async, type, body) {
    if (!~([ 'health', 'kibitz', 'join', 'bootstrap', 'shutdown' ]).indexOf(type)) {
        return [ { cookie: request.cookie, body: null } ]
    }
    this[type](body, async())
})

module.exports = Colleague
