const Avenue = require('avenue')

module.exports = function (Conference) {
    return async function (destructible, colleague, application, registration) {
        const inbox = new Avenue, outbox = new Avenue
        const promise = colleague.connect(inbox.shifter(), outbox)
        destructible.destruct(() => outbox.push(null))
        const conference = new Conference(destructible.durable([ 'conference', registration.island, registration.id ]), outbox.shifter(), inbox, application)
        return conference.exports
    }
}
