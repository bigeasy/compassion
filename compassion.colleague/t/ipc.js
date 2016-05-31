console.log('running')

process.send({ type: 'initialized' })

var send = true

process.on('message', function (message) {
    console.log(JSON.stringify(message))
    if (send) {
        send = false
        process.send({ type: 'publish', entry: { a: 1 } })
    }
})
