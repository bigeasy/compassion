function Recorder (source, logger, queue) {
    this._source = source
    this._queue = queue
    this._logger = logger
}

Recorder.prototype.push = function (envelope) {
    this._logger.info('recorded', { source: this._source, $envelope: envelope })
    this._queue.push({ source: this._source, $envelope: envelope })
}

module.exports = Recorder
