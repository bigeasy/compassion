require('proof')(1, prove)

async function prove (okay) {
    const Conduit = require('conduit')
    const Resolver = require('../resolver/conduit')
    const Destructible = require('destructible')
    const destructible = new Destructible('conduit.t')
    const Avenue = require('avenue')
    const inbox = new Avenue, outbox = new Avenue
    const destination = new Conduit(destructible.durable('destination'), inbox.shifter(), outbox, () => {
        return [ '127.0.0.1:8080' ]
    })
    const source = new Conduit(destructible.durable('source'), outbox.shifter(), inbox)
    const resolver = new Resolver(source)
    okay(await resolver.resolve(), [ '127.0.0.1:8080' ], 'resolve')
}
