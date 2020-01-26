require('proof')(1, prove)

async function prove (okay) {
    const axios = require('axios')
    const fs = require('fs').promises
    const path = require('path')
    const children = require('child_process')
    const Destructible = require('destructible')
    const destructible = new Destructible('t/olio.t')
    const once = require('prospective/once')
    try {
        await fs.unlink(path.join(__dirname, 'socket'))
    } catch (error) {
        if (error.code != 'ENOENT') {
            throw error
        }
    }
    const olio = children.spawn(path.resolve(__dirname, '../node_modules/.bin/olio'), [
        '--application', path.join(__dirname, 'olio.js'),
        '--configuration', path.join(__dirname, 'configuration.js'),
    ], {
        stdio: [ 'inherit', 'inherit', 'inherit', 'ipc' ]
    })

    const [ message ] = await once(olio, 'message').promise

    await new Promise(resolve => setTimeout(resolve, 1000))

    const got = await axios.get('http://127.0.0.1:8486/')
    okay(got.data, 'Compassion Colleague API\n', 'started')

    olio.kill()
}
