var http = require("http");
var net = require('net');
var fs = require('fs');
var path = require('path');
var walk = require('walk');
var launcherProc = {};
var spawn = require('child_process').spawn;
var launcherConn = {};
var common = require('../common');
var basePort = 4445;
var baseExecutionDir = path.resolve(__dirname,"../executionfiles");
var actionCache = {};

exports.Post = function(req, res){
    var command = req.body;
    common.logger.info(command);
    if(command.command == "run action"){
        common.logger.info("running action");
        //console.log(command);
        actionCache[basePort+command.threadID] = command;
        sendLauncherCommand(command,function(err){
            res.send(JSON.stringify({"error":err,"success":true}));
        });
    }
    else if(command.command == "cleanup"){
        common.logger.info("cleaning up");
        setTimeout(function(){
            //cleanUpOldExecutions(command.executionID);
        },1*60*1000);
        var count = 0;
        var cleanUpDirs = function(){
            deleteDir(baseExecutionDir + "/"+command.executionID,function(){
            });
            res.send('{"error":null,"success":true}');
        };

        if (Object.keys(launcherConn).length != 0){
            var toDelete = [];
            for(var propt in launcherConn){
                count++;
                if(propt.toString().indexOf(command.executionID) != -1){
                    toDelete.push(propt);
                    stopLauncher(command.executionID,parseInt(propt.substr(propt.length - 4)) - basePort,function(){});
                }
                if(count == Object.keys(launcherConn).length){
                    toDelete.forEach(function(conn){
                        console.log("should delete:"+conn);
                        delete launcherConn[conn];

                    });
                    cleanUpDirs()
                }
            }
        }
        else{
            cleanUpDirs();
        }
    }
    else if (command.command == "start launcher"){
        common.logger.info("starting launcher: ThreadID: "+command.threadID);
        startLauncher(command.executionID,command.threadID,function(err){
            res.send(JSON.stringify({"error":err}));
        });
    }
    else if (command.command == "files loaded"){
        fs.exists(baseExecutionDir+"/"+command.executionID+"/launcher/RedwoodHQLauncher.jar",function(exists){
            res.send(JSON.stringify({"loaded":exists}));
        })
    }
};


function startLauncher_debug(callback){
            launcherConn = net.connect(basePort, function(){
                callback(null);
                var cache = "";
                launcherConn.on('data', function(data) {
                    cache += data.toString();

                    common.logger.info('data:', data.toString());
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

function checkForDupLauncher(){

}


function startLauncher(executionID,threadID,callback){
    var libPath = baseExecutionDir+"/"+executionID+"/lib/";
    var launcherPath  = baseExecutionDir+"/"+executionID+"/launcher/";
    var portNumber = basePort + threadID;
    var javaPath = "";
    var classPath = "";

    //check if there is a process with same port already running
    var foundConn = null;
    for(var propt in launcherConn){
        if (propt.indexOf(portNumber.toString(), propt.length - portNumber.toString().length) !== -1){
            foundConn = launcherConn[propt];
        }
    }

    var startProcess = function(){
        if(require('os').platform() == "linux"){
            javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
            classPath = libPath+'*:'+launcherPath+'*';
        }
        else{
            javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
            classPath = libPath+'*;'+launcherPath+'*';
        }
        if (fs.existsSync(baseExecutionDir+"/"+executionID+"/bin") == false){
            fs.mkdirSync(baseExecutionDir+"/"+executionID+"/bin");
        }
        //launcherProc[executionID+portNumber.toString()] = require('child_process').execFile(javaPath+ " -cp " + classPath + " -Xmx512m "+"redwood.launcher.Launcher "+portNumber.toString(),{env:{PATH:baseExecutionDir+"/"+executionID+"/bin/"},cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        launcherProc[executionID+portNumber.toString()] = spawn(javaPath,["-cp",classPath,"-Xmx512m","redwood.launcher.Launcher",portNumber.toString()],{env:{PATH:baseExecutionDir+"/"+executionID+"/bin/:/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin"},cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        fs.writeFileSync(baseExecutionDir+"/"+executionID+"/"+threadID+"_launcher.pid",launcherProc[executionID+portNumber.toString()].pid);
        launcherProc[executionID+portNumber.toString()].stderr.on('data', function (data) {
            if(data.toString().indexOf("WARNING") != -1) return;
            common.logger.error("launcher error:"+data.toString());
            launcherProc[executionID+portNumber.toString()] = null;
            if (actionCache[portNumber]){
                //actionCache[portNumber].error = data;
                //actionCache[portNumber].result = "Failed";
                //sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                //delete actionCache[portNumber];
            }

            callback(data.toString());
        });
        common.logger.info("starting port:"+portNumber);
        launcherProc[executionID+portNumber.toString()].on('close', function (data) {
            delete launcherProc[executionID+portNumber.toString()];
            var checkForCrush = function(portNumber){
                if (actionCache[portNumber]){
                    actionCache[portNumber].error = "Launcher crashed";
                    actionCache[portNumber].result = "Failed";
                    sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                    delete actionCache[portNumber];
                }
            };

            setTimeout(checkForCrush(portNumber),5000);
            callback(data.toString());
        });
        var cmdCache = "";
        launcherProc[executionID+portNumber.toString()].stdout.on('data', function (data) {
            cmdCache += data.toString();
            common.logger.info('stdout: ' + data.toString());
            if (data.toString().indexOf("launcher running.") != -1){
                cmdCache = "";
                launcherConn[executionID+portNumber.toString()] = net.connect(portNumber, function(){
                    callback(null);
                    var cache = "";
                    launcherConn[executionID+portNumber.toString()].on('data', function(data) {
                        cache += data.toString();

                        common.logger.info('data:', data.toString());
                        if (cache.indexOf("--EOM--") != -1){

                            //var msg = JSON.parse(cache.substring(0,cache.length - 7));
                            var msg = JSON.parse(cache.substring(0,cache.indexOf("--EOM--")));
                            if (msg.command == "action finished"){
                                delete actionCache[portNumber];
                                if(msg.screenshot){
                                    common.sendFileToServer(baseExecutionDir+"/"+executionID + "/bin/" + msg.screenshot,msg.screenshot,"/screenshots",common.Config.AppServerIPHost,common.Config.AppServerPort,"executionID="+executionID+";resultID="+msg.resultID,function(){
                                        sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                                    })
                                }
                                else{
                                    sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                                }
                            }
                            if (msg.command == "Log Message"){
                                msg.date=new Date();
                                sendLog(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                            }
                            cache = cache.substring(cache.indexOf("--EOM--") + 7,cache.length);
                        }
                    });
                });

                launcherConn[executionID+portNumber.toString()].on('error', function(err) {
                    common.logger.error("Error connecting to launcher on port "+portNumber+": "+err);
                    //sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                    callback("Error connecting to launcher on port "+portNumber+": "+err);
                });
            }
            else{
                if (cmdCache.indexOf("\n") != -1){
                    if (cmdCache.length <= 2) {
                        cmdCache = "";
                        return;
                    }

                    cmdCache.split("\r\n").forEach(function(message,index,array){
                        if(index == array.length - 1){
                            if (cmdCache.lastIndexOf("\r\n")+2 !== cmdCache.length){
                                cmdCache = cmdCache.substring(cmdCache.lastIndexOf("\r\n") + 2,cmdCache.length);
                            }else{
                                if (message != ""){
                                    common.logger.info("sending:"+message);
                                    sendLog({message:message,date:new Date(),actionName:actionCache[portNumber].name,resultID:actionCache[portNumber].resultID},common.Config.AppServerIPHost,common.Config.AppServerPort);
                                }
                                cmdCache = "";
                            }
                        }
                        if (message != ""){
                            common.logger.info("sending:"+message);
                            if(actionCache[portNumber]){
                                sendLog({message:message,date:new Date(),actionName:actionCache[portNumber].name,resultID:actionCache[portNumber].resultID},common.Config.AppServerIPHost,common.Config.AppServerPort);
                            }
                        }
                    });
                }
            }
        });
    };

    if (foundConn != null){
        stopLauncher(executionID,threadID,function(){
            startProcess();
        });
    }
    else{
        try{
            foundConn = net.connect(portNumber, function(){
                foundConn.write(JSON.stringify({command:"exit"})+"\r\n",function(){
                    setTimeout(startProcess(),5000);
                });
            });
            foundConn.on("error",function(err){
                //common.logger.error(err);
                startProcess();
            })
        }
        catch(err){
            startProcess();
        }
    }
}

function stopLauncher(executionID,threadID,callback){
    if (launcherProc[executionID+threadID.toString()] != null){
        sendLauncherCommand({command:"exit",executionID:executionID,threadID:threadID},function(){
            try{
                process.kill(launcherProc[executionID+threadID.toString()].pid);
            }
            catch(exception){
                common.logger.error(exception);
            }
            delete launcherProc[executionID+threadID.toString()];
        });
    }
    //if there is runaway launcher try to kill it
    else{
        var conn;
        conn = net.connect(basePort+threadID, function(){
            conn.write(JSON.stringify({command:"exit"})+"\r\n");
        }).on('error', function(err) {
                //deleteDir(baseExecutionDir+"/"+executionID+"/launcher/",callback)
        });
    }


    if (fs.existsSync(baseExecutionDir+"/"+executionID+"/"+threadID+"_launcher.pid") == true){
        var pid = fs.readFileSync(baseExecutionDir+"/"+executionID+"/"+threadID+"_launcher.pid").toString();
        try{
            process.kill(pid,"SIGTERM");
        }
        catch(err){}
    }
    delete launcherConn[executionID+basePort+threadID];
    setTimeout(function() { callback();}, 2000);

}

exports.cleanUp = function(){
    cleanUpOldExecutions();
};

function cleanUpOldExecutions(ignoreExecution){

    fs.readdir(baseExecutionDir,function(err,list){
        if (!list) return;
        list.forEach(function(dir){
            if((ignoreExecution)&&(ignoreExecution == dir)) return;
            getExecutionStatus(common.Config.AppServerIPHost,common.Config.AppServerPort,dir,function(result){
                if((result.execution == null) || (result.execution.status == "Ready To Run")){
                    fs.readdir(baseExecutionDir+"/"+dir,function(err,list){
                        var dirs = [];
                        if (list){
                            list.forEach(function(file,index){
                                try{
                                    if (file.indexOf(".pid") != -1){
                                        var pid = fs.readFileSync(baseExecutionDir+"/"+dir+"/launcher/"+file).toString();
                                        process.kill(pid,"SIGTERM");
                                        fs.unlink(baseExecutionDir+"/"+dir+"/launcher/"+file);
                                    }
                                }
                                catch(err){}
                                if(index+1 == list.length){
                                    dirs.push(baseExecutionDir+"/"+dir);
                                }
                            });
                            dirs.forEach(function(dirCount){
                                deleteDir(dirCount)
                            });
                        }
                    });
                }
                common.logger.info(result)
            })
        });
    });
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
        allDirs.forEach(function(dirCount){
            try{
                fs.rmdirSync(dirCount);
            }
            catch(err){
                common.logger.info("dir "+ dirCount +" is not empty")
            }

            common.logger.info(dirCount);
        });
        try{
            fs.rmdirSync(dir);
        }
        catch(err){
            common.logger.info("dir "+ dir +" is not empty")
        }

        if(callback) callback();
    });

}

function sendLauncherCommand(command,callback){
    var portNumber = basePort+command.threadID;

    //console.log("sending to:"+portNumber);
    if (launcherConn[command.executionID+portNumber.toString()] == null){
        common.logger.error("unable to connect to launcher");
        callback("unable to connect to launcher");
        return;
    }
    launcherConn[command.executionID+portNumber.toString()].write(JSON.stringify(command)+"\r\n");
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
            common.logger.info('sendActionResult result: ' + chunk);
        });
    });

    //req.setTimeout( 5*60*1000, function( ) {
        // handle timeout here
    //});

    req.on('error', function(e) {
        common.logger.error('problem with sendActionResult request: ' + e.message);
        setTimeout(function(){sendActionResult(result,host,port);},10000);
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
            common.logger.info('sendLog result: ' + chunk);
        });
    });

    req.on('error', function(e) {
        common.logger.error('problem with sendLog request: ' + e.message);
        setTimeout(function(){sendLog(result,host,port);},10000);
    });

    // write data to request body
    req.write(JSON.stringify(result));
    req.end();
}

function getExecutionStatus(host,port,executionID,callback){
    var options = {
        hostname: host,
        port: port,
        path: '/executionstatus/'+executionID,
        method: 'GET',
        agent:false,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            common.logger.info('getExecutionStatus result: ' + chunk);
            callback(JSON.parse(chunk));
        });
    });

    req.on('error', function(e) {
        common.logger.error('problem with request: ' + e.message);
        setTimeout(function(){getExecutionStatus(result,host,port);},10000);
    });

    req.end();
}

