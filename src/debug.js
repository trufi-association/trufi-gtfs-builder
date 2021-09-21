const createDebug = require('debug')
const package = require('../package.json')
module.exports = function (debug) {
    console.log(debug)
}
// module.exports = createDebug(package.name)
