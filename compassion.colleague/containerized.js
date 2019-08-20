const Local = require('./local')
const Networked = require('./networked')

module.exports = async function (destructible, options) {
    const colleagues = { island: {}, token: {} }
    const local = new Local(destructible.durable('local'), colleagues, options)
    const networked = new Networked(destructible.durable('networked'), colleagues)
    await networked.reactor.fastify.listen(options.bind.port, options.bind.iface)
    destructible.destruct(() => networked.reactor.fastify.close())
    return { local, networked }
}
