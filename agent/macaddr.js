var exec = require('child_process').exec;

var re = /[^:\-](?:[0-9A-F][0-9A-F][:\-]){5}[0-9A-F][0-9A-F][^:\-]/i;
var cmds = ['/sbin/ifconfig', '/bin/ifconfig', 'ifconfig', 'ipconfig /all'];

var results = null;
var cbs = [];

var find_addresses = function(cb) {
    var i = 0;

    function run_cmd() {
        var cmd = cmds[i];
        exec(cmd, function(err, stdout, stderr) {
            var lines, line, match, cb, j;
            if (!err) {
                lines = stdout.split('\n');
                for (j = 0; j < lines.length; j++) {
                    line = lines[j];
                    match = re.exec(line);
                    if (match) {
                        match = match.toString().trim();
                        if (match.length) {
                            if (!results) {
                                results = [];
                            }
                            results.push(match);
                        }
                    }
                }
            }

            if (results && results.length > 0) {
                done();
            } else {
                i += 1;
                if (i < cmds.length) {
                    run_cmd();
                } else {
                    done();
                }
            }
        });
    };

    // Avoid calling out to the shell multiple times.
    // Queue up any callbacks, and call them all when done.
    var done = function() {
        while (cbs.length) {
            cb = cbs.shift();
            cb();
        }
    };

    if (results === null) {
        cbs.push(cb);
        if (cbs.length === 1) {
            run_cmd();
        }
    } else {
        cb();
    }
};

var address = function(cb) {
    if (!(cb instanceof Function)) {
        throw new Error('Argument to address must be a callback function');
    }

    var respond = function() {
        if (results && results.length >= 1) {
            cb(undefined, results[0]);
        } else {
            cb('No MAC addresses found');
        }
    }

    find_addresses(respond);
};


var all_addresses = function(cb) {
    if (!(cb instanceof Function)) {
        throw new Error('Argument to all_addresses must be a callback function');
    }

    var respond = function() {
        if (results !== null) {
            cb(undefined, results);
        } else {
            cb('No MAC addresses found');
        }
    }

    find_addresses(respond);
};

exports.address = address;
exports.all_addresses = all_addresses;