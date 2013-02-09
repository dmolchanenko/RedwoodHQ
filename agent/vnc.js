var argv = require('optimist').argv,
    net = require('net'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    path = require('path'),
    common = require('common'),
    fs = require('fs'),
    policyfile = require('policyfile'),
    spawn = require('child_process').spawn;

var Buffer = require('buffer').Buffer,
    WebSocketServer = require('ws').Server,
    webServer, wsServer,
    source_host, source_port, target_host, target_port,certFile,keyFile;


new_client = function(client) {

    console.log('Version ' + client.protocolVersion + ' protocol: ' + client.protocol);

    var target = net.createConnection(target_port,target_host, function() {
        console.log('connected to target');
    });
    target.on('data', function(data) {
        try {
            if (client.protocol === 'base64'){
                client.send(new Buffer(data).toString('base64'));
            } else {
                client.protocol = 'binary';
                client.send(data,{binary: true});
            }
        } catch(e) {
            console.log("Error:"+e);
            target.end();
        }
    });
    target.on('end', function() {
        console.log('disconnected');
    });

    client.on('message', function(msg) {
        try{
            if (client.protocol === 'base64') {
                target.write(new Buffer(msg, 'base64'),'binary');
            } else {
                target.write(msg,'binary');
            }
        }
        catch(err){
            console.log("Error:"+err)
        }
    });
    client.on('close', function(code, reason) {
        console.log('disconnected. code:' + code + ' reason:' + reason + '');
        target.end();
    });
    client.on('error', function(a) {
        console.log('Client error: ' + a);
        target.end();
    });
};

// Select 'binary' or 'base64' subprotocol, preferring 'binary'
selectProtocol = function(protocols, callback) {
    var plist = protocols ? protocols.split(',') : "";
    plist = protocols.split(',');
    if (plist.indexOf('binary') >= 0) {
        callback(true, 'binary');
    } else if (plist.indexOf('base64') >= 0) {
        callback(true, 'base64');
    } else {
        console.log("Client must support 'binary' or 'base64' protocol");
        callback(false);
    }
};

common.parseConfig(function(){
    target_host = "localhost";
    target_port = "5950";

    source_host = "localhost";
    source_port = common.config.AgentVNCPort;

    console.log("WebSocket settings: ");
    console.log("    - proxying from " + source_host + ":" + source_port +
        " to " + target_host + ":" + target_port);

    if (certFile) {
        argv.key = argv.key || argv.cert;
        var cert = fs.readFileSync(certFile),
            key = fs.readFileSync(keyFile);
        console.log("    - Running in encrypted HTTPS (wss://) mode using: " + certFile + ", " + keyFile);
        webServer = https.createServer({cert: cert, key: key});
    } else {
        console.log("    - Running in unencrypted HTTP (ws://) mode");
        webServer = http.createServer();
    }
    webServer.listen(source_port, function() {
        wsServer = new WebSocketServer({server: webServer,
            handleProtocols: selectProtocol});
        wsServer.on('connection', new_client);
    });

    // Attach Flash policyfile answer service
    policyfile.createServer().listen(-1, webServer);

    //start vnc server
    var vncPath = path.resolve(__dirname,"../../vendor/UltraVNC/");
    launcherProc = spawn(vncPath+"/winvnc.exe",[],{cwd:vncPath});
});

