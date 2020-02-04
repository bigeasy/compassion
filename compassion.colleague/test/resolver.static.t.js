require('proof')(1, (okay) => {
    const Resolver = { Static: require('../resolver/static') }
    const urls = [ 'http://127.0.0.1:8080' ]
    const resolver = new Resolver.Static(urls)
    okay(resolver.resolve(), urls, 'static')
})
