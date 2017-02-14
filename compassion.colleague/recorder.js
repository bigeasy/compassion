function Recorder (logger) {
    this._logger = logger
}

Recorder.prototype.push = function (envelope) {
    this._logger.info('recorded', { $envelope: envelope })
}

module.exports = Recorder
