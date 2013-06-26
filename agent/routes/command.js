var http = require("http");
var net = require('net');
var fs = require('fs');
var path = require('path');
var walk = require('walk');
var launcherProc = null;
var spawn = require('child_process').spawn;
var launcherConn = null;
var common = require('../common');
var currentAction = null;

exports.Post = function(req, res){
    var command = req.body;
    if(command.command == "run action"){
        console.log("running action");
        currentAction = command;
        sendLauncherCommand(command,function(err){
            res.send(JSON.stringify({"error":err,"success":true}));
        });
    }
    else if(command.command == "cleanup"){
        console.log("cleaning up");
        stopLauncher(function(){
            cleanUpBinDir(function(){
                cleanUpLibDir(function(){
                    res.send('{"error":null,"success":true}');
                })
            });
        });
    }
    else if (command.command == "start launcher"){
        console.log("starting launcher");
        startLauncher(function(err){
            if (err == null){
                res.send('{"error":null,"success":false}');
            }
            else{
                res.send(JSON.stringify({"error":err,"success":false}));
            }
        });
    }
};


function startLauncher_debug(callback){
            launcherConn = net.connect(3002, function(){
                callback(null);
                var cache = "";
                launcherConn.on('data', function(data) {
                    cache += data.toString();

                    console.log('data:', data.toString());
                    if (cache.indexOf("--EOM--") != -1){
                        var msg = JSON.parse(cache.substring(0,cache.length - 7));
                        if (msg.command == "action finished"){
                            sendActionResult(msg);
                        }
                        cache = "";
                    }
                });

                launcherConn.on('error', function(err) {
                    callback(err);
                });
            });
}



function startLauncher(callback){
    var libPath = path.resolve(__dirname,"../lib")+"/";
    var launcherPath  = path.resolve(__dirname,"../launcher")+"/";
    launcherProc = spawn(path.resolve(__dirname,"../../vendor/Java/bin")+"/java.exe",["-cp",libPath+'*;'+launcherPath+'*',"-Xmx512m","redwood.launcher.Launcher"],{env:{PATH:path.resolve(__dirname,"../bin/")},cwd:path.resolve(__dirname,"../bin/")});
    launcherProc.stderr.on('data', function (data) {
        console.log("error:"+data.toString());
        launcherProc = null;
        callback(data.toString());
    });
    var cmdCache = "";
    launcherProc.stdout.on('data', function (data) {
        cmdCache += data.toString();
        console.log('stdout: ' + data.toString());
        if (data.toString().indexOf("launcher running.") != -1){
            cmdCache = "";
            launcherConn = net.connect(3002, function(){
                callback(null);
                var cache = "";
                launcherConn.on('data', function(data) {
                    cache += data.toString();

                    console.log('data:', data.toString());
                    if (cache.indexOf("--EOM--") != -1){

                        //var msg = JSON.parse(cache.substring(0,cache.length - 7));
                        var msg = JSON.parse(cache.substring(0,cache.indexOf("--EOM--")));
                        if (msg.command == "action finished"){
                            sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                        }
                        if (msg.command == "Log Message"){
                            msg.date=new Date();
                            sendLog(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                        }
                        cache = cache.substring(cache.indexOf("--EOM--") + 7,cache.length);
                    }
                });
            });

            launcherConn.on('error', function(err) {
                console.log("Error connecting to launcher: "+err);
                //sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                callback("Error connecting to launcher: "+err);
            });
        }
        else{
            if (cmdCache.indexOf("\r\n") != -1){
                if (cmdCache.length == 2) {
                    cmdCache = "";
                    return;
                }

                cmdCache.split("\r\n").forEach(function(message,index,array){
                    if(index == array.length - 1){
                        if (cmdCache.lastIndexOf("\r\n")+2 !== cmdCache.length){
                            cmdCache = cmdCache.substring(cmdCache.lastIndexOf("\r\n") + 2,cmdCache.length);
                        }else{
                            if (message != ""){
                                console.log("sending:"+message);
                                sendLog({message:message,date:new Date(),actionName:currentAction.name,resultID:currentAction.resultID},common.Config.AppServerIPHost,common.Config.AppServerPort);
                            }
                            cmdCache = "";
                        }
                    }
                    if (message != ""){
                        console.log("sending:"+message);
                        sendLog({message:message,date:new Date(),actionName:currentAction.name,resultID:currentAction.resultID},common.Config.AppServerIPHost,common.Config.AppServerPort);
                    }
                });
            }
        }
    });
}

function stopLauncher(callback){
    if (launcherProc != null){
        sendLauncherCommand({command:"exit"},function(){
            try{
                process.kill(launcherProc.pid);
            }
            catch(exception){}
            //launcherProc.kill();
            launcherProc = null;
            deleteDir(path.resolve(__dirname,"../launcher/"),callback)
        });
    }
    //if there is runaway launcher try to kill it
    else{
        var conn;
        conn = net.connect(3002, function(){
            conn.write(JSON.stringify({command:"exit"})+"\r\n");
            setTimeout(function() { callback();}, 1000);
        }).on('error', function(err) {
            deleteDir(path.resolve(__dirname,"../launcher/"),callback);
        });
    }

}

function cleanUpBinDir(callback){
    deleteDir(path.resolve(__dirname,"../bin/"),callback)
}
function cleanUpLibDir(callback){
    deleteDir(path.resolve(__dirname,"../lib/"),callback)
}

function deleteDir(dir,callback){
    var walker = walk.walkSync(dir);

    var allDirs = [];
    walker.on("file", function (root, fileStats, next) {
        fs.unlinkSync(root+"/"+fileStats.name);
    });

    walker.on("directories", function (root, dirs, next) {
        dirs.forEach(function(dir){
            allDirs.push(root+"/"+dir.name);
        });
        next();
    });
    walker.on("end", function () {
        //res.send("{error:null,success:true}");
        allDirs.reverse();
        allDirs.forEach(function(dir){
            try{
                fs.rmdirSync(dir);
            }
            catch(err){
                console.log("dir "+ dir +" is not empty")
            }

            console.log(dir);
        });
        callback();
    });

}

function sendLauncherCommand(command,callback){
    if (launcherConn == null){
        console.log("unable to connect to launcher");
        return;
    }
    launcherConn.write(JSON.stringify(command)+"\r\n");
    //launcherConn.end();
    callback(null);
}


function sendActionResult(result,host,port){
    var options = {
        hostname: host,
        port: port,
        path: '/executionengine/actionresult',
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(result));
    req.end();
}

function sendLog(result,host,port){
    var options = {
        hostname: host,
        port: port,
        path: '/executionengine/logmessage',
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(result));
    req.end();
}