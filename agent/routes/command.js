var http = require("http");
var net = require('net');
var fs = require('fs');
var path = require('path');
var walk = require('walk');
var launcherProc = null;
var spawn = require('child_process').spawn;
var launcherConn = null;
var common = require('../common');

exports.Post = function(req, res){
    var command = req.body;
    if(command.command == "run action"){
        console.log("running action");
        sendLauncherCommand(command,function(err){
            res.send("{error:"+err+",success:true}");
        });

    }
    else if(command.command == "cleanup"){
        console.log("cleaning up");
        stopLauncher(function(){
            cleanUpBinDir(function(){
                res.send("{error:null,success:true}");
            });
        });
    }
    else if (command.command == "start launcher"){
        console.log("starting launcher");
        startLauncher(function(err){
            if (err == null){
                res.send("{error:"+err+",success:true}");
            }
            else{
                res.send("{error:"+err+",success:false}");
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
    launcherProc = spawn(path.resolve(__dirname,"../../vendor/Java/bin")+"/java.exe",["-cp",libPath+'*;'+launcherPath+'*',"-Xmx512m","redwood.launcher.Launcher"],{cwd:path.resolve(__dirname,"../bin/")});
    launcherProc.stderr.on('data', function (data) {
        console.log("error:"+data.toString());
        launcherProc = null;
        callback(data.toString());
    });
    launcherProc.stdout.on('data', function (data) {
        console.log('stdout: ' + data.toString());
        if (data.toString().indexOf("launcher running.") != -1){
            launcherConn = net.connect(3002, function(){
                callback(null);
                var cache = "";
                launcherConn.on('data', function(data) {
                    cache += data.toString();

                    console.log('data:', data.toString());
                    if (cache.indexOf("--EOM--") != -1){
                        var msg = JSON.parse(cache.substring(0,cache.length - 7));
                        if (msg.command == "action finished"){
                            sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                        }
                        cache = "";
                    }
                });

                launcherConn.on('error', function(err) {
                    callback(err);
                });
            });
        }
    });
}

function stopLauncher(callback){
    if (launcherProc != null){
        //sendLauncherCommand({command:"exit"},function(){
            launcherProc.kill();
            launcherProc = null;
            callback();
        //});
    }
    //if there is runaway launcher try to kill it
    else{
        var conn;
        conn = net.connect(3002, function(){
            conn.write(JSON.stringify({command:"exit"})+"\r\n");
            setTimeout(function() { callback();}, 1000);
        }).on('error', function(err) {
                callback();
            });
    }
}

function cleanUpBinDir(callback){
    deleteDir(path.resolve(__dirname,"../bin/"),callback)
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