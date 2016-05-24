console.log('running')

process.send({ type: 'initialized' })

process.on('message', function (message) {
    console.log(JSON.stringify(message))
})
