function Recorder (source, sink) {
    this._source = source
    this._sink = sink
}

Recorder.prototype.push = function (envelope) {
    this._sink.push({ source: this._source, $envelope: envelope })
}

module.exports = Recorder
