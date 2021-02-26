var scripts = require('../routes/scripts');

exports.dircontents = function (test) {
    scripts.scriptsGet();
    test.done();
};