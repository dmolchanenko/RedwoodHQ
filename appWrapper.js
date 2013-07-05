var forever = require('forever-monitor');
var fs = require('fs');
var path = require('path');
var dbPath =  __dirname + "/vendor/MongoDB/bin/mongod.exe";
var logPath = __dirname + "/logs";
var common = require('./common');

if (process.argv[2] === "--stop"){
    if (fs.existsSync(__dirname+"/app.pid")){
        var pids = fs.readFileSync(__dirname+"/app.pid").toString();
        fs.unlink(__dirname+"/app.pid");
        try{
            process.kill(pids.split("\r\n")[0],"SIGTERM");
        }
        catch(err){}
        setTimeout(function(){
            try{
                process.kill(pids.split("\r\n")[1],"SIGTERM");
                process.kill(pids.split("\r\n")[2],"SIGTERM");
            }
            catch(err){}
        },3000);
    }
    return;
}

common.parseConfig(function(){

    if (!fs.existsSync(logPath)){
        fs.mkdirSync(logPath);
    }

    var appChild = new (forever.Monitor)('app.js', {
        silent: false,
        options: [],
        killTree: true,
        'outFile': logPath+'/app.out.log',
        'errFile': logPath+'/app.err.log'
    });

    var dbChild = forever.start([ dbPath,"--port",common.Config.DBPort ], {
        max : 1,
        silent : false,
        'outFile': logPath+'/db.out.log',
        'errFile': logPath+'/db.err.log'
    });

    var dbStarted = false;
    var dbOut = "";

    dbChild.on('stdout', function (data) {
        if (dbStarted == false){
            dbOut = dbOut + data.toString();
            if (dbOut.indexOf("waiting for connections on port") != -1){
                dbStarted = true;
                appChild.start();
            }
            //console.log('stdout: ' + data);
            //console.log('stdout: ' + data);
        }
    });

    dbChild.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

});




setTimeout(function(){
    fs.writeFileSync(__dirname+"/app.pid",process.pid+"\r\n"+dbChild.child.pid +"\r\n"+appChild.child.pid);
},40000);