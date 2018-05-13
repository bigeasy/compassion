function Recorder (events, id, type) {
    this._events = events
    this._id = id
    this._type = type
}

Recorder.prototype.record = function (body) {
    if (body != null) {
        this._events.push({ type: this._type, id: this._id, body: JSON.parse(JSON.stringify(body)) })
    }
}

module.exports = Recorder
