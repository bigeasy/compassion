const Colleague = require('./colleague')

module.exports = async function (destructible, options) {
    const colleague = new Colleague(destructible.durable('colleague'))
    await colleague.reactor.fastify.listen(options.bind.port, options.bind.iface)
    destructible.destruct(() => colleague.reactor.fastify.close())
    return colleague
}
