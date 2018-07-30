module.exports = function (logger) {
    return function (envelope, callback) {
        logger.notice('event', { $envelope: envelope })
        callback()
    }
}
