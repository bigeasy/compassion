describe('population', () => {
    const Reactor = require('reactor')
    const Resolver = { Static: require('../resolver/static') }
    const Population = require('../population')
    class Service {
        constructor () {
            this.reactor = new Reactor([{
                path: '/island/island/islanders',
                method: 'get',
                f: this.islanders.bind(this)
            }])
            this.islanders = [
                [{
                    id: 'first',
                    government: {},
                    cookie: 0,
                    createdAt: 0
                }, {
                    id: 'second',
                    government: {},
                    cookie: 0,
                    createdAt: 1
                }],
                404
            ]
        }

        islanders (request) {
            return this.islanders.shift()
        }
    }

    const service = new Service

    before(() => service.reactor.fastify.listen(8888))
    after(() => service.reactor.fastify.close())

    it('can perform a census', async () => {
        const resolver = new Resolver.Static([ 'http://127.0.0.1:8888/', 'http://127.0.0.1:8888/' ])
        const population = new Population(resolver)
        const census = await population.census('island')
    })
})
