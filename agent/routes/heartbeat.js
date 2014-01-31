var http = require('http');
var os = require('os');
var common = require('../common');
var macaddr = require('../macaddr');

exports.startHeartBeat = function(server,serverPort,agentPort,vncPort,agentVersion){
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
                setTimeout(recursive,60*1000)
            });
        });

        req.on('error', function(e) {
            common.logger.error('problem with request: ' + e.message);
            setTimeout(recursive,20000);
        });

        // write data to request body
        req.write(JSON.stringify({macAddress:macAddress,hostname:os.hostname(),port:agentPort,vncPort:vncPort,agentVersion:agentVersion}));
        req.end();
    };

    macaddr.address(function(err, addr) {
        if (addr) {
            macAddress = addr;
            recursive();
        } else {
            common.logger.error('MAC address not found');
        }
    });

};