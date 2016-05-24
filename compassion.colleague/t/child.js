function Child (colleague) {
    colleague.messages.on('message', function (type, value) {
        console.log(type, value)
    })
}

module.exports = Child
