function Recorder (source, logger) {
    this._source = source
    this._logger = logger
}

Recorder.prototype.push = function (envelope) {
    this._logger.info('recorded', { source: this._source, $envelope: envelope })
}

module.exports = Recorder
