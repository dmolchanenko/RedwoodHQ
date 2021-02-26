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
var basePythonPort = 6445;
var baseCSharpPort = 8445;
var baseExecutionDir = path.resolve(__dirname,"../executionfiles");
var actionCache = {};
var logCache = [];
var logCacheUnit = [];

exports.Post = function(req, res){
    var command = req.body;
    common.logger.info(command);
    if(command.command == "run action"){
        common.logger.info("running action");
        //console.log(command);
        var portNumber;
        var type;
        command.matchID = common.uniqueId();
        if(!command.scriptLang) command.scriptLang = "Java/Groovy";
        if(command.scriptLang == "Java/Groovy"){
            actionCache[basePort+command.threadID] = command;
            portNumber = basePort+command.threadID;
            type = "java"
        }
        else if(command.scriptLang == "Python"){
            actionCache[basePythonPort+command.threadID] = command;
            portNumber = basePythonPort+command.threadID;
            if(command.type == "pytest"){
                type = "pytest"
            }
            else{
                type = "python"
            }
        }
        else if(command.scriptLang == "C#"){
            actionCache[baseCSharpPort+command.threadID] = command;
            portNumber = baseCSharpPort+command.threadID;
            type = "csharp"
        }

        if(!launcherConn[command.executionID+portNumber.toString()]){
            var sent = false;
            startLauncher(command.executionID,command.threadID,type,function(msg){
                if(sent == true) return;
                sent = true;
                if(msg && msg.error){
                    res.json({"error":msg.error,"success":true});
                    return
                }
                sendLauncherCommand(command,null,function(err){
                    res.send(JSON.stringify({"error":err,"success":true}));
                });
            })
        }
        else{
            sendLauncherCommand(command,null,function(err){
                res.send(JSON.stringify({"error":err,"success":true}));
            });
        }
    }
    else if(command.command == "cleanup"){
        common.logger.info("cleaning up");
        //setTimeout(function(){
        //cleanUpOldExecutions(command.executionID);
        //},1*60*1000);
        var count = 0;
        var cleanUpDirs = function(){
            common.deleteDir(baseExecutionDir + "/"+command.executionID,function(){
            });
        };

        if (Object.keys(launcherConn).length != 0){
            var toDelete = [];
            for(var propt in launcherConn){
                count++;
                if(propt.toString().indexOf(command.executionID) != -1){
                    toDelete.push(propt);
                    stopLauncher(command.executionID,parseInt(propt.substr(propt.length - 4)),function(){
                        res.send('{"error":null,"success":true}');
                        cleanUpDirs()
                    });
                }
                else if(count == Object.keys(launcherConn).length){
                    toDelete.forEach(function(conn){
                        console.log("should delete:"+conn);
                        delete launcherConn[conn];

                    });
                    res.send('{"error":null,"success":true}');
                    cleanUpDirs()
                }
            }
        }
        else{
            res.send('{"error":null,"success":true}');
            cleanUpDirs();
        }
    }
    else if (command.command == "start launcher"){
        res.send(JSON.stringify({"error":null}));
        return;
        common.logger.info("starting launcher: ThreadID: "+command.threadID);
        startLauncher(command.executionID,command.threadID,"java",function(err){
            if(err){
                res.send(JSON.stringify({"error":err}));
                return
            }
            startLauncher(command.executionID,command.threadID,"python",function(err){
                res.send(JSON.stringify({"error":err}));
            });
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


function startLauncher(executionID,threadID,type,callback){
    var libPath = baseExecutionDir+"/"+executionID+"/lib/";
    var launcherPath  = baseExecutionDir+"/"+executionID+"/launcher/";
    var javaPath = "";
    var portNumber;
    if(type == "java"){
        portNumber = basePort + threadID;
    }
    else if(type == "python" || type == "pytest"){
        portNumber = basePythonPort + threadID;
    }
    else if(type == "csharp"){
        portNumber = baseCSharpPort + threadID;
    }
    var classPath = "";

    //check if there is a process with same port already running
    var foundConn = null;
    for(var propt in launcherConn){
        if (propt.indexOf(portNumber.toString(), propt.length - portNumber.toString().length) !== -1){
            foundConn = launcherConn[propt];
        }
    }

    var startProcess = function(){
        var pythonPath = "";
        var pythonLibPath = "";
        var pythonLauncherPath = "";

        if (fs.existsSync(baseExecutionDir+"/"+executionID+"/bin") == false){
            fs.mkdirSync(baseExecutionDir+"/"+executionID+"/bin");
        }
        var pathDivider = ";";
        if(require('os').platform() == "linux" || (require('os').platform() == "darwin")) {
            pathDivider = ":"
        }
        if(type == "java"){
            javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
            classPath = libPath+'*'+pathDivider+launcherPath+'*';
            /*
             if(require('os').platform() == "linux"){
             javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
             classPath = libPath+'*:'+launcherPath+'*';
             }
             if(require('os').platform() == "darwin"){
             javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
             classPath = libPath+'*:'+launcherPath+'*';
             }
             else{
             javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
             classPath = libPath+'*;'+launcherPath+'*';
             }
             */
            var javaEnv = process.env;
            javaEnv.PATH = baseExecutionDir+"/"+executionID+"/bin/:/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin:"+javaEnv.PATH;
            launcherProc[executionID+portNumber.toString()] = spawn(javaPath,["-cp",classPath,"-Xmx512m","-Dfile.encoding=UTF8","redwood.launcher.Launcher",portNumber.toString()],{env:javaEnv,cwd:baseExecutionDir+"/"+executionID+"/bin/"});
            //launcherProc[executionID+portNumber.toString()] = spawn(javaPath,["-cp",classPath,"-Xmx512m","-Dfile.encoding=UTF8","redwood.launcher.Launcher",portNumber.toString()],{env:{PATH:baseExecutionDir+"/"+executionID+"/bin/:/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin"},cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        }
        else if(type == "python" || type == "pytest"){
            pythonLauncherPath = path.resolve(__dirname,"../lib")+"/pythonLauncher.py";
            if(process.platform == "win32"){
                pythonLibPath = pathDivider+baseExecutionDir+"/"+executionID+"/lib/site-packages";
                pythonPath = path.resolve(__dirname,"../../vendor/Python")+"/python";
            }
            else{
                //pythonLibPath = pathDivider+baseExecutionDir+"/"+executionID+"/lib/python2.7/site-packages";
                pythonLibPath = pathDivider+baseExecutionDir+"/"+executionID+"/lib/site-packages";
                if(fs.existsSync("/usr/local/bin/python")){
                    pythonPath = "/usr/local/bin/python"
                }
                else{
                    pythonPath = "/usr/bin/python"
                }
            }
            launcherProc[executionID+portNumber.toString()] = spawn(pythonPath,[pythonLauncherPath,portNumber.toString()],{env:{PATH:process.env.PATH+pathDivider+baseExecutionDir+"/"+executionID+"/bin/",PYTHONPATH:path.resolve(__dirname,"../../vendor/Python/DLLs")+pathDivider+path.resolve(__dirname,"../../vendor/Python/lib")+pathDivider+baseExecutionDir+"/"+executionID+"/src/"+pythonLibPath},cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        }
        else if(type == "csharp"){
            //var csharpLauncherPath = baseExecutionDir+"/"+executionID+"/lib/CSharpLauncher.exe";
            var csharpLauncherPath = path.resolve(__dirname,"../lib")+"/CSharpLauncher.exe";
            launcherProc[executionID+portNumber.toString()] = spawn(csharpLauncherPath,[portNumber.toString(),baseExecutionDir+"/"+executionID+"/lib/RedwoodHQAutomation.dll"],{cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        }
        //launcherProc[executionID+portNumber.toString()] = require('child_process').execFile(javaPath+ " -cp " + classPath + " -Xmx512m "+"redwood.launcher.Launcher "+portNumber.toString(),{env:{PATH:baseExecutionDir+"/"+executionID+"/bin/"},cwd:baseExecutionDir+"/"+executionID+"/bin/"});
        fs.writeFileSync(baseExecutionDir+"/"+executionID+"/"+threadID+type+"_launcher.pid",launcherProc[executionID+portNumber.toString()].pid);
        launcherProc[executionID+portNumber.toString()].stderr.on('data', function (data) {
            if(actionCache[portNumber]){
                sendLog({message:"STDOUT ERROR: " + data.toString(),date:new Date(),actionName:actionCache[portNumber].name,resultID:actionCache[portNumber].resultID,executionID:executionID},common.Config.AppServerIPHost,common.Config.AppServerPort);
            }
            else{
                return;
            }
            if(data.toString().indexOf("WARNING") != -1) return;
            if(data.toString().indexOf("JavaScript error") != -1) return;
            common.logger.error("launcher error:"+data.toString());
            if (actionCache[portNumber]){
                //launcherProc[executionID+portNumber.toString()] = null;
                //org.jclouds.logging.jdk.JDKLogger
                if(data.toString().indexOf("org.jclouds.logging.jdk.JDKLogger") != -1 && data.toString().indexOf("SEVERE") != -1){
                    //actionCache[portNumber].error = data.toString();
                    //actionCache[portNumber].result = "Failed";
                    //sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                    //delete actionCache[portNumber];
                }
            }

            //callback(data.toString());
        });
        common.logger.info("starting port:"+portNumber);
        //var launcherRetry = 1;
        var checkForCrush = function(portNumber){
            if (actionCache[portNumber]){
                actionCache[portNumber].error = "Launcher crashed";
                actionCache[portNumber].result = "Failed";
                sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                delete actionCache[portNumber];
            }
        };
        launcherProc[executionID+portNumber.toString()].on('close', function (data) {
            if(launcherProc[executionID+portNumber.toString()]){
                delete launcherProc[executionID+portNumber.toString()];
                setTimeout(checkForCrush(portNumber),1000);
            }
            if(data != null){
                callback(data.toString());
            }
            else{
                callback(null);
            }
        });
        var launcherCrashed = false;
        var cmdCache = "";
        launcherProc[executionID+portNumber.toString()].stdout.on('data', function (data) {
            cmdCache += data.toString();
            //common.logger.info('stdout: ' + data.toString());
            if (data.toString().indexOf("launcher running.") != -1){
                cmdCache = "";
                launcherConn[executionID+portNumber.toString()] = net.connect(portNumber, function(){
                    callback(null);
                    var cache = "";
                    launcherConn[executionID+portNumber.toString()].on('data', function(tcpData) {
                        cache += tcpData.toString();

                        //common.logger.info('data:', tcpData.toString());
                        if (cache.indexOf("--EOM--") != -1){

                            //var msg = JSON.parse(cache.substring(0,cache.length - 7));
                            var msg = JSON.parse(cache.substring(0,cache.indexOf("--EOM--")));
                            if (msg.command == "action finished"){
                                if(msg.matchID != actionCache[portNumber].matchID){
                                    cache = "";
                                    return;
                                }
                                delete actionCache[portNumber];
                                if(msg.screenshot){
                                    common.sendFileToServer(baseExecutionDir+"/"+executionID + "/bin/" + msg.screenshot,msg.screenshot,"/screenshots",common.Config.AppServerIPHost,common.Config.AppServerPort,"executionID="+executionID+";resultID="+msg.resultID,function(){
                                        sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                                    })
                                }
                                else{
                                    sendActionResult(msg,common.Config.AppServerIPHost,common.Config.AppServerPort);
                                }
                                cache = "";
                            }
                            if (msg.command == "Log Message"){
                                //if()
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
                    //checkForCrush(portNumber);
                    if(launcherCrashed == false){
                        callback({error:"Error connecting to launcher on port "+portNumber+": "+err});
                        launcherCrashed = true;
                    }
                });
            }
            else{
                if (cmdCache.indexOf("\n") != -1){
                    if (cmdCache.length <= 2) {
                        cmdCache = "";
                        return;
                    }

                    cmdCache.split(require('os').EOL).forEach(function(message,index,array){
                        if(index == array.length - 1){
                            if (cmdCache.lastIndexOf(require('os').EOL)+2 !== cmdCache.length){
                                cmdCache = cmdCache.substring(cmdCache.lastIndexOf(require('os').EOL) + 2,cmdCache.length);
                            }else{
                                if (message != ""){
                                    //common.logger.info("sending:"+message);
                                    sendLog({executionID:executionID,message:message,date:new Date(),actionName:actionCache[portNumber].name,resultID:actionCache[portNumber].resultID},common.Config.AppServerIPHost,common.Config.AppServerPort);
                                }
                                cmdCache = "";
                            }
                        }
                        if (message != ""){
                            //common.logger.info("sending:"+message);
                            if(actionCache[portNumber]){
                                sendLog({message:message,date:new Date(),actionName:actionCache[portNumber].name,executionID:executionID,runType:actionCache[portNumber].runType,resultID:actionCache[portNumber].resultID,username:actionCache[portNumber].username},common.Config.AppServerIPHost,common.Config.AppServerPort);
                            }
                        }
                    });
                }
            }
        });
    };

    var retryStartingCount = 5;
    if (foundConn != null){
        stopLauncher(executionID,basePort + threadID,function(){
            stopLauncher(executionID,basePythonPort + threadID,function(){
                stopLauncher(executionID,baseCSharpPort + threadID,function(){
                    startProcess();
                });
            });
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
                retryStartingCount--;
                if(retryStartingCount <= 0){
                    actionCache[portNumber].error = "Launcher crashed";
                    actionCache[portNumber].result = "Failed";
                    sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                    delete actionCache[portNumber];
                }
                else{
                    setTimeout(startProcess(),5000);
                }
                //common.logger.error(err);
                //startProcess();
            })
        }
        catch(err){
            retryStartingCount--;
            if(retryStartingCount <= 0){
                actionCache[portNumber].error = "Launcher crashed";
                actionCache[portNumber].result = "Failed";
                sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
                delete actionCache[portNumber];
            }
            else{
                setTimeout(startProcess(),5000);
            }
            //startProcess();
        }
    }
}

function stopLauncher(executionID,port,callback){
    var kill = require('tree-kill');
    if (launcherProc[executionID+port.toString()] != null){
        sendLauncherCommand({command:"exit",executionID:executionID},port,function(){
            try{
                launcherConn[executionID+port.toString()].destroy();
                kill(launcherProc[executionID+port.toString()].pid, 'SIGKILL');
                //require('tree-kill').kill(launcherProc[executionID+port.toString()].pid);
                process.kill(launcherProc[executionID+port.toString()].pid,"SIGINT");
                //spawn("kill "+launcherProc[executionID+port.toString()].pid)
            }
            catch(exception){
                common.logger.error(exception);
            }
            delete launcherProc[executionID+port.toString()];
        });
    }
    //if there is runaway launcher try to kill it
    else{
        var conn;
        conn = net.connect(port, function(){
            conn.write(JSON.stringify({command:"exit"})+"\r\n");
        }).on('error', function(err) {
            //deleteDir(baseExecutionDir+"/"+executionID+"/launcher/",callback)
        });
    }


    if (fs.existsSync(baseExecutionDir+"/"+executionID+"/"+port.toString()+"java_launcher.pid") == true){
        var jpid = fs.readFileSync(baseExecutionDir+"/"+executionID+"/"+port.toString+"java_launcher.pid").toString();
        try{
            kill(jpid,"SIGINT");
        }
        catch(err){}
    }
    if (fs.existsSync(baseExecutionDir+"/"+executionID+"/"+port.toString()+"python_launcher.pid") == true){
        var ppid = fs.readFileSync(baseExecutionDir+"/"+executionID+"/"+port.toString()+"python_launcher.pid").toString();
        try{
            kill(ppid,"SIGINT");
        }
        catch(err){}
    }
    if (fs.existsSync(baseExecutionDir+"/"+executionID+"/"+port.toString()+"csharp_launcher.pid") == true){
        var ppid = fs.readFileSync(baseExecutionDir+"/"+executionID+"/"+port.toString()+"csharp_launcher.pid").toString();
        try{
            kill(ppid,"SIGINT");
        }
        catch(err){}
    }
    delete launcherConn[executionID+port.toString()];
    setTimeout(function() { callback();}, 4000);

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
                                common.deleteDir(dirCount)
                            });
                        }
                    });
                }
                common.logger.info(result)
            })
        });
    });
}

function sendLauncherCommand(command,port,callback){
    var portNumber;
    if(command.scriptLang == "Java/Groovy"){
        portNumber = basePort+command.threadID;
    }
    else if(command.scriptLang == "Python"){
        portNumber = basePythonPort+command.threadID;
    }
    else if(command.scriptLang == "C#"){
        portNumber = baseCSharpPort+command.threadID;
    }
    if(port != null) portNumber = port;

    //common.logger.info("sending command: "+ JSON.stringify(command));
    if (launcherConn[command.executionID+portNumber.toString()] == null){
        common.logger.error("unable to connect to launcher");
        callback("unable to connect to launcher");
        if(actionCache[portNumber]){
            actionCache[portNumber].error = "Launcher crashed";
            actionCache[portNumber].result = "Failed";
            sendActionResult(actionCache[portNumber],common.Config.AppServerIPHost,common.Config.AppServerPort);
        }
        callback(null);
        return;
    }
    launcherConn[command.executionID+portNumber.toString()].write(JSON.stringify(command)+"\r\n");
    callback(null);
}


function sendActionResult(result,host,port){
    var path = "/executionengine/actionresult";
    if(result.runType == "unittest"){
        path = "/rununittest/result"
    }
    var options = {
        hostname: host,
        port: port,
        path: path,
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json',
            'Connection': 'Close'
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
    if(result.runType == "unittest"){
        if(logCacheUnit.length == 0){
            logCacheUnit.push(result);
            setTimeout(function(){sendLogPost(logCacheUnit,host,port,"/rununittest/log");logCacheUnit = [];},500);
        }
        else{
            logCacheUnit.push(result);
        }
    }
    else{
        if(logCache.length == 0){
            logCache.push(result);
            //console.log(result);
            setTimeout(function(){sendLogPost(logCache,host,port,"/executionengine/logmessage");logCache = [];},4000);
        }
        else{
            //actionName
            //if(logCache[logCache.length-1].resultID == result.resultID && logCache[logCache.length-1].date.getTime() === result.date.getTime() && logCache[logCache.length-1].actionName === result.actionName){
            //logCache[logCache.length-1].message = logCache[logCache.length-1].message + "<br>"+result.message;
            //    result.date = new Date(logCache[logCache.length-1].date.getTime() + 1);
            //    logCache.push(result);
            //}
            //else{
            logCache.push(result);
            //}
        }
    }

}

function sendLogPost(result,host,port,path){
    //var path = '/executionengine/logmessage';
    //if(result.runType == "unittest"){
    //    path = "/rununittest/log"
    //}
    var options = {
        hostname: host,
        port: port,
        path: path,
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json',
            'Connection': 'Close'
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
        setTimeout(function(){sendLogPost(result,host,port,path);},10000);
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
            common.logger.info('getExecutionStatus result: ' + chunk.toString());
            try{
                callback(JSON.parse(chunk));
            }
            catch(error){callback({execution:null})}
        });
    });

    req.on('error', function(e) {
        common.logger.error('problem with request: ' + e.message);
        setTimeout(function(){getExecutionStatus(result,host,port);},10000);
    });

    req.end();
}

