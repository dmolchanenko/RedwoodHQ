var forever = require('forever-monitor');
var path = require('path');
var fs = require('fs');
var logPath = path.resolve(__dirname,"../log");


if (process.argv[2] === "--stop"){
    if (fs.existsSync(__dirname+"/agent.vnc.pid")){
        var pids = fs.readFileSync(__dirname+"/agent.vnc.pid").toString();
        fs.unlink(__dirname+"/agent.vnc.pid");
        process.kill(pids.split("\r\n")[0],"SIGTERM");
        setTimeout(function(){
            process.kill(pids.split("\r\n")[1],"SIGTERM");
            process.kill(pids.split("\r\n")[2],"SIGTERM");
        },3000);
    }
    return;
}

if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}

var vnc = new (forever.Monitor)('vnc.js', {
    silent: false,
    options: [],
    killTree: true,
    'outFile': logPath+'/agent.vnc.out.log',
    'errFile': logPath+'/agent.vnc.err.log'
});

vnc.start();

var vncPath = path.resolve(__dirname,"../vendor/UltraVNC/");

var ultraVNC = forever.start([vncPath+'/winvnc.exe'], {
    max : 1,
    silent : false,
    killTree: true
});


setTimeout(function(){
    fs.writeFileSync(__dirname+"/agent.vnc.pid",process.pid+"\r\n"+vnc.child.pid+"\r\n"+ultraVNC.child.pid);
},7000);