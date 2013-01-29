var http = require("http");
var net = require('net');
var fs = require('fs');
var path = require('path');
var walk = require('walk');
var launcherProc = null;
var spawn = require('child_process').spawn;
var launcherConn = null;

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
        cleanUpBinDir(function(){
            res.send("{error:null,success:true}");
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

function startLauncher(callback){
    //callback();
    //return
    launcherProc = spawn("../Java/bin/java.exe",["-cp",'../lib/*;../launcher/*',"redwood.launcher.Launcher"],{cwd:path.resolve(__dirname,"../bin/")});
    launcherProc.stderr.on('data', function (data) {
        console.log("error:"+data.toString());
        callback(data.toString());
    });
    launcherProc.stdout.on('data', function (data) {
        console.log('stdout: ' + data.toString());
        if (data.toString() == "launcher running.\r\n"){
            callback(null);
            launcherConn = net.connect(3002, function(){
                launcherConn.on('data', function(data) {
                    console.log('data:', data.toString());
                    var msg = JSON.parse(data.toString());
                    if (msg.command == "action finished"){
                        sendActionResult(msg);
                    }
                });

                launcherConn.on('error', function(err) {
                    callback(err);
                });
            });
        }
    });


}

function cleanUpBinDir(callback){
    if (launcherProc != null){
        launcherProc.kill();
        launcherProc = null;
    }
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
    launcherConn.write(JSON.stringify(command)+"\n");
    launcherConn.end();
}


function sendActionResult(result){
    var options = {
        hostname: "localhost",
        port: 3000,
        path: 'executionengine/actionresult',
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