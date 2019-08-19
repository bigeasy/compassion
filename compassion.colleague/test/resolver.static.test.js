describe('static resolver', () => {
    const Resolver = { Static: require('../resolver/static') }
    const assert = require('assert')
    it('can resolve', () => {
        const urls = [ 'http://127.0.0.1:8080' ]
        const resolver = new Resolver.Static(urls)
        assert.deepStrictEqual(resolver.resolve(), urls, 'static')
    })
})
