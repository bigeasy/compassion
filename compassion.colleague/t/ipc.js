process.send({ type: 'initialized' })

var send = true
var reinstatementId = null

process.on('message', function (message) {
    console.log('message', JSON.stringify(message))
    switch (message.type) {
    case 'reinstate':
        reinstatementId = message.reinstatementId
        break
    case 'entry':
        if (send) {
            send = false
            process.send({ type: 'publish', reinstatementId: reinstatementId, entry: { a: 1 } })
        }
        break
    }
})
