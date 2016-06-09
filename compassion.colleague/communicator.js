var cadence = require('cadence')
var Cliffhanger = require('cliffhanger')

var instance = 0

function Communicator (conduit, colleagueId, cancelable) {
    this._instance = instance++
    this._cliffhanger = new Cliffhanger
    this._cancelable = cancelable
    this._conduit = conduit
}


module.exports = Cliffhanger
