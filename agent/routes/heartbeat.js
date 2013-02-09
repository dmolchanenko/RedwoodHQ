var http = require('http');
var os = require('os');
var macaddr = require('../macaddr');

exports.startHeartBeat = function(server,serverPort,agentPort,vncPort){
    /*
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
     */
    var macAddress = null;

    var recursive = function () {
        var options = {
            hostname: server,
            port: serverPort,
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
            setTimeout(recursive,20000);
        });

        // write data to request body
        req.write(JSON.stringify({macAddress:macAddress,hostname:os.hostname(),port:agentPort,vncPort:vncPort}));
        req.end();
    };

    macaddr.address(function(err, addr) {
        if (addr) {
            macAddress = addr;
            recursive();
        } else {
            console.log('MAC address not found');
        }
    });

};