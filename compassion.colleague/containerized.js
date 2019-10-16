const Colleague = require('./colleague')

module.exports = async function (destructible, options) {
    const colleague = new Colleague(destructible.durable('colleague'), options)
    await colleague.reactor.fastify.listen(options.bind.port, options.bind.iface)
    destructible.destruct(async () => colleague.reactor.fastify.close())
    destructible.destruct(() => console.log('closing!'))
    return colleague
}
