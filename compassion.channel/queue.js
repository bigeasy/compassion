function Queue (queue, sink) {
    this._queue = queue
    this._sink = sink
}

Queue.prototype.push = function (json) {
    this._queue.push({
        module: 'compassion.channel',
        method: 'log',
        body: json
    })
    this._sink.push(json)
}

module.exports = Queue
