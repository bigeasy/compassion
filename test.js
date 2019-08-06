const fs = require('fs')
const child = require('child_process')
const path = require('path')

fs.readdirSync(__dirname)
    .filter(file => /^compassion\.[^.]+$/.test(file))
    .filter(dir => ~fs.readdirSync(path.join(dir)).indexOf('test'))
    .forEach(dir => {
    console.log(dir)
    const tests = fs.readdirSync(path.join(__dirname, dir, 'test'))
    if (tests.filter(test => /\.test\.js$/.test(test)).length != 0) {
        const spawn = child.spawnSync('npm', [ 'test' ], { cwd: path.join(__dirname, dir), stdio: 'inherit' })
        if (spawn.status != 0) {
            process.exit(1)
        }
    }
})
