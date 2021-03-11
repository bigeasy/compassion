class Recorder {
    constructor (events, id, type) {
        this._events = events
        this._id = id
        this._type = type
    }

    record (body) {
        if (body != null) {
            this._events.push({ type: this._type, id: this._id, body: JSON.parse(JSON.stringify(body)) })
        }
    }
}

module.exports = Recorder
