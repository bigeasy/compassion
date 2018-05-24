var Scheduler = require('happenstance/scheduler')
var Timer = require('happenstance/timer')
var cadence = require('cadence')
var coalesce = require('extant')
var UserAgent = require('vizsla')

function Pinger (destructible, options) {
    this._interval = coalesce(coalesce(options.ping, {}).application, 1000)

    var scheduler = new Scheduler
    var timer = new Timer(scheduler)

    destructible.destruct.wait(scheduler, 'clear')
    destructible.destruct.wait(timer.events.pump(this, '_ping', destructible.monitor('timer')), 'destroy')
    destructible.destruct.wait(scheduler.events.pump(timer, 'enqueue', destructible.monitor('scheduler')), 'destroy')

    this._scheduler = scheduler

    this._ua = new UserAgent
}

Pinger.prototype._ping = cadence(function (async, envelope) {
    async(function () {
        this._ua.fetch({
            url: envelope.key,
            token: envelope.body.token,
            parse: 'dump'
        }, {
            url: './ping'
        }, async())
    }, function (body, response) {
        if (response.okay) {
            this._scheduler.schedule(Date.now() + this._interval, envelope.key, envelope.body)
        } else {
            envelope.body.destructible.destroy()
        }
    })
})

Pinger.prototype.clear = function (url) {
    this._scheduler.unschedule(url)
}

Pinger.prototype.keepAlive = function (url, token, destructible) {
    this._scheduler.schedule(Date.now()+ this._interval, url, { token: token, destructible: destructible })
}

module.exports = cadence(function (async, destructible, interval) {
    return new Pinger(destructible, interval)
})
