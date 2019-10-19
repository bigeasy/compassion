const Interrupt = require('interrupt').create('xfoo')

const i =  new Interrupt('oh, my goodness', { key: 1 })

console.log(Object.keys(i))

throw i
