var forever = require('forever-monitor');
var fs = require('fs');
var path = require('path');
var dbPath =  __dirname + "/vendor/MongoDB/bin/mongod";
var logPath = __dirname + "/logs";
var common = require('./common');
var dataPath = __dirname + "/data/db";
var storedPids = [];

if (process.argv[2] === "--stop"){
    if (fs.existsSync(__dirname+"/app.pid")){
        var pids = fs.readFileSync(__dirname+"/app.pid").toString();
        fs.unlink(__dirname+"/app.pid");
        try{
            //process.kill(pids.split("\r\n")[1],"SIGTERM");
            process.kill(pids.split("\r\n")[0],"SIGTERM");
        }
        catch(err){
            console.log(err);
        }
        setTimeout(function(){
            try{
                pids = fs.readFileSync(__dirname+"/db.pid").toString();
                process.kill(pids.split("\r\n")[0],"SIGTERM");
            }
            catch(err){
                console.log(err);
            }
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
        killTree: true
        //'outFile': logPath+'/app.out.log',
        //'errFile': logPath+'/app.err.log',
        //pidFile: "app.pid"
    });

    var dbChild = forever.start([ dbPath,"--port",common.Config.DBPort,"--dbpath",dataPath,"--journal"], {
        max : 1,
        silent : false,
        'outFile': logPath+'/db.out.log',
        'errFile': logPath+'/db.err.log'
        //pidFile: "db.pid"
    });

    var dbStarted = false;
    var dbOut = "";

    appChild.start();
    dbChild.on('stdout', function (data) {
        if (dbStarted == false){
            dbOut = dbOut + data.toString();
            if (dbOut.indexOf("waiting for connections on port") != -1){
                dbStarted = true;
                //setTimeout(function(){
                //    fs.writeFileSync(__dirname+"/app.pid",process.pid+"\r\n"+dbChild.child.pid +"\r\n"+appChild.child.pid);
                //},10000);
            }
            //console.log('stdout: ' + data);
            //console.log('stdout: ' + data);
        }
    });

    dbChild.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    process.on('exit', function() {
        try{
            process.kill(storedPids[0]);
        }catch(err){}
        try{
            process.kill(storedPids[1]);
        }catch(err){}

    });


    setTimeout(function(){
        console.log(dbChild.child.pid);
        console.log(appChild.child.pid);

        storedPids.push(dbChild.child.pid);
        storedPids.push(appChild.child.pid);
        fs.writeFileSync(__dirname+"/app.pid",appChild.child.pid+"\r\n"+process.pid);
        fs.writeFileSync(__dirname+"/db.pid",dbChild.child.pid);
    },40000);

});




