require('proof')(1, async (okay) => {
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

    await service.reactor.fastify.listen(8888)

    try {
        const resolver = new Resolver.Static([ 'http://127.0.0.1:8888/', 'http://127.0.0.1:8888/' ])
        const population = new Population(resolver)
        const census = await population.census('island')
        okay(census, [{
            id: 'first',
            government: {},
            cookie: 0,
            url: 'http://127.0.0.1:8888/island/island/islander/first/',
            createdAt: 0
        }, {
            id: 'second',
            government: {},
            cookie: 0,
            url: 'http://127.0.0.1:8888/island/island/islander/second/',
            createdAt: 1
        }, null ], 'census')
    } finally {
        service.reactor.fastify.close()
    }
})
