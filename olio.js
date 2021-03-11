const coalesce = require('extant')

const Colleague = require('./colleague')
const Population = require('./population')
const Resolver = require('./resolver/conduit')

module.exports = async function (destructible, olio, properties) {
    const sender = await olio.sender('mingle')
    const resolver = new Resolver(sender.processes[0].conduit)
    const ping = coalesce(properties.ping, {})
    const timeout = coalesce(properties.timeout, {})
    const bind = coalesce(properties.bind, {})
    const colleague = new Colleague(destructible.durable('containerized'), {
        population: new Population(resolver),
        ping: coalesce(properties.ping, null),
        timeout: coalesce(properties.timeout, null)
    })
    await colleague.reactor.fastify.listen(properties.bind.port, properties.bind.iface)
    console.log(properties.bind)
    const axios = require('axios')
    const got = await axios.get('http://127.0.0.1:8486/')
    console.log(got.data)
    return function (header, queue, shifter) {
        colleague.connect(shifter, queue)
    }
}
