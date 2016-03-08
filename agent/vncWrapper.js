var forever = require('forever-monitor');
var path = require('path');
var fs = require('fs');
var logPath = path.resolve(__dirname,"../logs");


if (process.argv[2] === "--stop"){
    if (fs.existsSync(__dirname+"/agent.vnc.pid")){
        var vncpid = fs.readFileSync(__dirname+"/agent.vnc.pid").toString();
        //fs.unlink(__dirname+"/agent.vnc.pid");
        //try{
            process.kill(vncpid.split("\r\n")[0],"SIGTERM");
        //}
        //catch(err){}
    }
    if (fs.existsSync(__dirname+"/agent.vncproxy.pid")){
        var proxypid = fs.readFileSync(__dirname+"/agent.vncproxy.pid").toString();
        //fs.unlink(__dirname+"/agent.vncproxy.pid");
        try{
            process.kill(proxypid.split("\r\n")[0],"SIGTERM");
        }
        catch(err){}
    }
    return;
}

if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}

var vnc = new (forever.Monitor)('vnc.js', {
    silent: false,
    options: [],
    killTree: true
    //'outFile': logPath+'/agent.vnc.out.log',
    //'errFile': logPath+'/agent.vnc.err.log'
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