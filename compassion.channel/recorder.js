function Recorder (source, queue) {
    this._source = source
    this._queue = queue
}

Recorder.prototype.push = function (envelope) {
    this._queue.push({ source: this._source, $envelope: envelope })
}

module.exports = Recorder
