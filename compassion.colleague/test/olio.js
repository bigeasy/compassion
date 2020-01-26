const path = require('path')
exports.configure = function (configuration) {
    return {
        socket: configuration.socket,
        constituents: {
            mingle: {
                module: 'mingle',
                workers: 1,
                properties: {
                    module: 'mingle.static',
                    format: 'http://%s:%d/',
                    addresses: [ '127.0.0.1:8486' ]
                }
            },
            compassion: {
                path: path.resolve(__dirname, '../olio.js'),
                workers: 1,
                properties: {
                    bind: { iface: '127.0.0.1', port: 8486 }
                }
            }
        }
    }
}
