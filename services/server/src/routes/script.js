var fs = require('fs');
var p = require('path');
var git = require('../gitinterface/gitcommands');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var spawn = require('child_process').spawn;
var realtime = require("./realtime");
var curentPipProcs = {};
var scripts = require("./scripts");
var app = require('../common');

exports.runPipGet = function(req,res){
    if(curentPipProcs[req.cookies.username] == true){
        res.json({success:false,error:"Please wait until current pip command is done."});
        return;
    }
    else{
        res.json({error:null});
        curentPipProcs[req.cookies.username] = true;
    }
    var uninstallAll = false;
    fs.readFile(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements","utf8",function(err,data){
        if(!data.match(/[^\W_]/)){
            uninstallAll = true;
        }
        runPip(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements",uninstallAll,req.cookies.username,function(freezeData){
            realtime.emitMessage("PythonRequirementRun"+req.cookies.username,{freezeData:freezeData});
            curentPipProcs[req.cookies.username] = false;
        })
    });
};

exports.scriptGet = function(req, res){
    var sent = false;
    GetScript(req.body.path,function(data){
        if (sent == true) return;
        res.contentType('json');
        if (data.error){
            res.json({error:data});
        }
        else{
            res.json({text:data});
        }
        sent = true;
    });
};

exports.mergeInfo = function(req,res){
    var workDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    var relativePath = req.body.path.replace(workDir+"/","");
    git.showFileContents(workDir,relativePath,":3",function(mine){
        //git.showFileContents(rootDir+req.cookies.project+"/"+"master.git",relativePath,"HEAD",function(theirs){
        git.showFileContents(workDir,relativePath,":2",function(theirs){
            res.json({mine:mine,theirs:theirs});
        });
    });
};

exports.resolveConflict = function(req, res){
    var workDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    ResolveConflict(workDir,req.body.path,req.body.text,function(filesInConflict){
        var db = app.getDB();
        var files = [];
        if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
            files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
        }

        db.collection('projects', function(err, collection) {
            collection.findOne({name: req.cookies.project}, {}, function (err, project) {
                var hostname = project.externalRepoURL;
                if(!hostname){
                    res.json({error:null,filesInConflict:files});
                    return;
                }
                git.pushRemote(workDir,"remoteRepo",req.cookies.username,function(){
                    res.json({error:null,filesInConflict:files});
                })
            });
        });

    });
};

exports.scriptPut = function(req, res){
    if(req.body.newName){
        git.rename(req.body.path.substring(0,req.body.path.lastIndexOf("/")),req.body.path.substring(req.body.path.lastIndexOf("/")+1,req.body.path.length),req.body.newName,function(){
            res.json({error:null});
        });
    }
    else{
        var filePath = "/"+req.cookies.username+"/PipRequirements";
        if(req.body.path.indexOf(filePath) == req.body.path.length -filePath.length){
            if(curentPipProcs[req.cookies.username] == true){
                res.json({success:false,error:"Please wait until current pip command is done."});
                return;
            }
            else{
                res.json({error:null});
                curentPipProcs[req.cookies.username] = true;
            }

                var indexURL = "";
                if(req.body.text && req.body.text.indexOf("\n") != -1 && req.body.text.split("\n")[0].indexOf("--index-url") != -1){
                    indexURL = req.body.text.split("\n")[0]+"\n";
                }
                fs.writeFile(req.body.path,req.body.text,'utf8',function(err) {
                    if (!err) {
                        var uninstallAll = false;
                        if(!req.body.text.match(/[^\W_]/)){
                            uninstallAll = true;
                        }
                        runPip(req.body.path,uninstallAll,req.cookies.username,function(freezeData){
                            UpdateScript(req.body.path,indexURL+freezeData,function(){
                                realtime.emitMessage("PythonRequirementRun"+req.cookies.username,{freezeData:indexURL+freezeData});
                                curentPipProcs[req.cookies.username] = false;
                            });
                        })
                    }
                });
        }
        else{
            UpdateScript(req.body.path,req.body.text,function(){
                res.json({error:null});
            });
        }
    }
};

exports.scriptPost = function(req, res){
    CreateScript(req.body.path,req.body.text,rootDir+req.cookies.project+"/"+req.cookies.username,function(err){
        if (err){
            res.json({error:err});
        }
        else{
            res.json({error:null});
        }
    });
};

exports.runPip = function(reqFilePath,uninstallAll,username,callback){runPip(reqFilePath,uninstallAll,username,callback)};

function runPip(reqFilePath,uninstallAll,username,callback){
    var pip;
    if(process.platform == "win32"){
        pip = spawn("cmd.exe",["/K"])
    }
    else{
        //pip = spawn("bash")
        pip = spawn("bash");
    }
    //var python  = spawn(path.resolve(__dirname,'../vendor/Python/bin/python'),[path.resolve(__dirname,'../vendor/Python/Lib/site-packages/virtualenv.py'),'PythonWorkDir'],{cwd: userFolder,timeout:300000});
    var baseDir = reqFilePath.replace("/PipRequirements","");
    if(process.platform == "win32"){
        pip.stdin.write("cd "+baseDir+'/PythonWorkDir/Scripts/\r\n');
    }
    else{
        pip.stdin.write("cd '"+baseDir+"/PythonWorkDir/bin/'\n");
        pip.stdin.write("echo '(PythonWorkDir)'\n");
    }
    //pip.stdin.write('cd ../../\r\n');
    var cliData = "";
    var activated = false;
    var freezeFileBegin = false;

    if(process.platform == "win32"){
        pip.stdin.write("for %I in (.) do cd %~sI\r\n");
        pip.stdin.write("activate\r\n");
    }

    pip.stdout.on('data', function (data) {
        realtime.emitMessage("PythonRequirementRun"+username,{message:data.toString()});
        console.log(data.toString());
        if(data.toString().indexOf("(PythonWorkDir)") != -1 || data.toString().indexOf("(PYTHON~1)") != -1){
            if(activated == false){
                if(uninstallAll == true){
                    if(process.platform == "win32"){
                        pip.stdin.write('cd "'+path.resolve(__dirname,'../vendor/Python') +'"\r\n');
                        pip.stdin.write("for %I in (.) do cd %~sI\r\n");
                        pip.stdin.write('python Lib/site-packages/virtualenv.py --clear "'+baseDir+'/PythonWorkDir"\r\n');
                        activated = true;
                    }
                    else if(process.platform == "darwin"){
                        pip.stdin.write('/Library/Frameworks/python/2.7/bin/virtualenv --clear '+"'"+baseDir+'/PythonWorkDir'+"'"+'\n');
                        activated = true;
                    }
                    else{
                        pip.stdin.write('/usr/bin/virtualenv --clear '+"'"+baseDir+'/PythonWorkDir'+"'"+'\n');
                        activated = true;
                    }
                }
                else{
                    if(process.platform == "win32"){
                        pip.stdin.write("pip install -r ../../PipRequirements\r\n");
                        activated = true;
                    }
                    else{
                        pip.stdin.write(baseDir+'/PythonWorkDir/bin/'+"pip install -r ../../PipRequirements\n");
                        pip.stdin.write("echo '(PythonWorkDir)'\n");
                        activated = true;
                    }
                }
            }
            else{
                if(freezeFileBegin == false){
                    cliData = "";
                    freezeFileBegin = true;
                    if(process.platform == "win32"){
                        pip.stdin.write("pip freeze\r\n");
                    }
                    else{
                        pip.stdin.write(baseDir+'/PythonWorkDir/bin/'+"pip freeze\n");
                        pip.stdin.write("echo '(PythonWorkDir)'\n");
                        //spawn(baseDir+'/PythonWorkDir/bin/'+"pip freeze\r\n",{cwd: baseDir,timeout:300000});
                    }
                    return;
                }
                else{
                    pip.stdin.end();
                    //pip.disconnect();
                    return;
                }
            }
        }
        if(data.toString().indexOf("pip freeze") != -1) return;
        cliData = cliData + data.toString();
        //console.log(data.toString());
    });

    pip.stderr.on('data', function (data) {
        console.log( data.toString());
        realtime.emitMessage("PythonRequirementRun"+username,{message:data.toString()});
        pip.stdin.end();
        app.logger.error('Setup Python Scripts stderr: ' + data.toString());
    });


    pip.on('close', function (code) {
        //fs.writeFile(userFolder + "/" + ".gitignore","Scripts");
        //console.log(cliData);
        if(uninstallAll == true) cliData = "";
        if(callback) callback(cliData);
    });
}

function UpdateScript(path,data,callback){
    if(typeof data != "undefined" ){
        fs.writeFile(path,data,'utf8',function(err){
            if (err) {
                callback({error:err});
                return;
            }
            var gitInfo = git.getGitInfo(path);

            //git.commit(gitInfo.path,gitInfo.fileName,function(){

                callback(null);
            //});
        })
    }
    else{
        callback(null)
    }
}

function ResolveConflict(workDir,file,data,callback){
    git.resetFile(workDir,file,function(){
        fs.writeFile(file,data,'utf8',function(err){
            if (err) {
                callback({error:err});
                return;
            }
            git.add(workDir,file,function(){
                git.commitForMerge(workDir,file,'conflict resoved',function(){
                    git.filesInConflict(workDir,function(files){
                        scripts.handleConflicts(workDir,files,function(files){
                            callback(files);
                        })
                    });
                });
            });
        });
    })
}

function GetScript(path,callback){
    fs.stat(path, function(err, stat) {
        if (err) {
            callback({error:err});
            return;
        }
        if(stat.size > 209715200){
            callback("")
        }
        else{
            fs.readFile(path, 'utf8' ,function (err, data) {
                if (err) callback({error:err});
                callback(data);
            });
        }
    });
}

function CreateScript(filePath,data,projectPath,callback){
    fs.exists(filePath,function(exists){
        if (!exists){
            fs.writeFile(filePath,data,'utf8',function(err){
                if (err){
                    callback(err.message);
                }
                else{
                    var commit = function(path,callback){
                        var gitInfo = git.getGitInfo(path);
                        git.add(gitInfo.path,gitInfo.fileName,function(){
                            //git.commit(gitInfo.path,gitInfo.fileName,function(){
                                callback(null);
                            //});
                        });
                    };
                    //if python make sure __init__ is in all parent paths
                    if (filePath.slice(-2) == "py"){
                        var parentPath = path.resolve(filePath,"../");
                        var finalPath = path.resolve(projectPath+"/src","./");
                        console.log(parentPath);
                        commit(filePath,function(){
                            callback(null);
                            while(finalPath != parentPath){
                                if(fs.existsSync(parentPath+"/__init__.py") == false){
                                    fs.writeFileSync(parentPath+"/__init__.py","",'utf8');
                                    commit(parentPath+"/__init__.py",function(){});
                                }
                                parentPath = path.resolve(parentPath,"../");
                            }
                        });
                    }
                    else{
                        commit(filePath,function(){callback(null)});
                    }
                }
            })
        }
        else{
            callback("File already exists.")
        }
    });
}
