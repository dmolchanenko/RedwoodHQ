var http = require('http');
var os = require('os');

exports.startHeartBeat = function(server){
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if ((address.family == 'IPv4' && !address.internal) ) {
                addresses.push(address.address)
            }
        }
    }

    console.log(addresses);

    var recursive = function () {
        var options = {
            hostname: "localhost",
            port: 3001,
            path: '/heartbeat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {

            });
        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });

        // write data to request body
        req.write(JSON.stringify({}));
        req.end();
        setTimeout(recursive,20000);
    };
    recursive();
};