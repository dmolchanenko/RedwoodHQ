var forever = require('forever-monitor');
var fs = require('fs');
var path = require('path');
var logPath = path.resolve(__dirname,"../logs");

if (process.argv[2] === "--stop"){
    if (fs.existsSync(__dirname+"/agent.pid")){
        var pids = fs.readFileSync(__dirname+"/agent.pid").toString();
        fs.unlink(__dirname+"/agent.pid");
        try{
            process.kill(pids.split("\r\n")[0],"SIGTERM");
        }
        catch(err){}
        setTimeout(function(){
            try{
                process.kill(pids.split("\r\n")[1],"SIGTERM");
            }
            catch(err){}
        },3000);
    }
    return;
}

if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}
var child = new (forever.Monitor)('app.js', {
    silent: false,
    options: [],
    killTree: true
    //'outFile': logPath+'/agent.out.log',
    //'errFile': logPath+'/agent.err.log'
});

child.start();

setTimeout(function(){
    fs.writeFileSync(__dirname+"/agent.pid",process.pid+"\r\n"+child.child.pid);
},3000);