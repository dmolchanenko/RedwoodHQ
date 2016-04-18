var fs = require('fs');
var git = require('../gitinterface/gitcommands');
var common = require('../common');
var users = require('./users');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var spawn = require('child_process').spawn;
var walk = require('walk');
var images = require("./imageautomation");
var script = require("./script");
var executionengine = require("./executionengine");
var realtime = require("./realtime");

exports.findText = function(req,res){
    var workDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    var relativePath = req.body.fullPath.replace(workDir+"/","");
    var patternType = "--fixed-strings";
    var caseSensitive = null;
    if(req.body.regExp == true){
        patternType = "--basic-regexp"
    }

    if(req.body.case == false){
        caseSensitive = "--ignore-case"
    }
    git.findText(workDir,req.body.text,patternType,caseSensitive,relativePath,function(cliOut){
        var foundResults = [];
        var returnValue = [];
        if ((cliOut != "")&&(cliOut.indexOf("\n") != -1)){
            foundResults = cliOut.split("\n",cliOut.match(/\n/g).length);
        }
        foundResults.forEach(function(file){
            if (file.indexOf("Binary file") == 0){
                return
            }
            returnValue.push({fullPath:file.split(":")[0],line:file.split(":")[1],matchedText:file.split(file.split(":")[1]+":")[1]});
        });
        res.json({foundResults:returnValue,error:null});
    })
};

exports.notPushedScripts = function(req,res){
    isProjectRemote(req.cookies.project,function(remote,externalRepoURL) {
        var repo = "origin/master";
        if (remote == true) {
            repo = "remotes/remoteRepo/"+req.cookies.username;
        }

        git.filesNotPushed(rootDir+req.cookies.project+"/"+req.cookies.username,true,repo,function(filesNotPushed){
            var filesNP = [];
            if ((filesNotPushed != "")&&(filesNotPushed.indexOf("\n") != -1)){
                filesNP = filesNotPushed.split("\n",filesNotPushed.match(/\n/g).length);
            }

            var notPushedTree = [];
            var dirsAdded = {};
            filesNP.forEach(function(file){
                var state = file.split("\t")[0];
                file = file.split("\t")[1];
                var dirs = file.split("/");
                var lastDir = null;
                dirs.forEach(function(dir,index){
                    if(index >= dirs.length - 1){
                        var fileNotPushed = {checked:true,leaf:true,name:dir,fullpath:file,icon:getFileTypeIcon(file)};
                        if(state == "A"){
                            fileNotPushed.text = '<span style="color:green">' + dir + '</span>';
                        }
                        else if(state == "M"){
                            fileNotPushed.text = '<span style="color:blue">' + dir + '</span>';
                        }
                        else if(state == "D"){
                            fileNotPushed.text = '<span style="color:red">' + dir + '</span>';
                        }
                        else{
                            fileNotPushed.text = '<span style="color:black">' + dir + '</span>';
                        }
                        if(lastDir == null){
                            notPushedTree.push(fileNotPushed);
                        }
                        else{
                            lastDir.children.push(fileNotPushed);
                        }
                        return;
                    }
                    if(lastDir == null){
                        for(var i=0;i<notPushedTree.length;i++){
                            if(dir == notPushedTree[i].name){
                                lastDir = notPushedTree[i];
                                return;
                            }
                        }
                        lastDir = {expanded:true,checked:true,text:dir,name:dir,cls:"folder",leaf:false,children:[]};
                        notPushedTree.push(lastDir);
                    }
                    else{
                        for(var i2=0;i2<lastDir.children.length;i2++){
                            if(dir == lastDir.children[i2].name){
                                lastDir = lastDir.children[i2];
                                return;
                            }
                        }
                        var DirToAdd = {expanded:true,checked:true,text:dir,name:dir,cls:"folder",leaf:false,children:[]};
                        lastDir.children.push(DirToAdd);
                        lastDir = DirToAdd;
                    }

                })
            });
            res.contentType('json');
            res.json({notPushed:notPushedTree});
        });
    });
};


exports.scriptsPush = function(req,res) {
    executionengine.compileBuild(req.cookies.project, req.cookies.username, function (err) {
        if (err != null) {
            res.contentType('json');
            res.json({error: "Unable to compile scripts.  Make sure compilation problems are fixed before you push."});
            return;
        }
        git.gitStatus(rootDir + req.cookies.project + "/" + req.cookies.username, function (data) {
            if (data.indexOf("You have unmerged paths") != -1) {
                res.json({error: "You have unmerged files.  Please resolve all conflicts first."});
                return;
            }
            var files = "";
            req.body.files.forEach(function (file) {
                if (files == "") {
                    files = '"'+file+'"'
                }
                else {
                    files = files + ' "' + file + '"'
                }
            });
            git.attachHEAD(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
                //git.addAll(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
                    git.commit(rootDir + req.cookies.project + "/" + req.cookies.username,req.body.files, req.body.comment,function () {
                        isProjectRemote(req.cookies.project,function(remote,externalRepoURL){
                            if(remote == true){
                                git.pushRemote(rootDir+req.cookies.project+"/"+req.cookies.username,"remoteRepo",req.cookies.username,function(code,cliOut) {
                                    res.contentType('json');
                                    if(code != 0){
                                        res.json({success:true,error:"Push did not succeed please do a pull first.  "+cliOut});
                                    }
                                    else{
                                        res.json({success:true});
                                    }
                                });
                            }
                            else{
                                git.push(rootDir+req.cookies.project+"/"+req.cookies.username,function(code,error) {
                                    res.contentType('json');
                                    if(code != 0){
                                        res.json({success:true,error:"Push did not succeed please do a pull first.\r\n"+error});
                                    }
                                    else{
                                        res.json({success:true});
                                    }
                                });
                            }
                        });
                    });
                //});

            });
        });
    });
};



exports.scriptsPush_old = function(req,res){
    executionengine.compileBuild(req.cookies.project,req.cookies.username,function(err){
        if (err != null){
            res.contentType('json');
            res.json({error:"Unable to compile scripts.  Make sure compilation problems are fixed before you push."});
            return;
        }
        git.gitStatus(rootDir+req.cookies.project+"/"+req.cookies.username,function(data){
            if(data.indexOf("You have unmerged paths") != -1){
                res.json({error:"You have unmerged files.  Please resolve all conflicts first."});
                return;
            }
            var files = "";
            req.body.files.forEach(function(file){
                if(files == ""){
                    files = file
                }
                else{
                    files = files + "|" + file
                }
            });
            git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                git.pushDryRun(rootDir+req.cookies.project+"/"+req.cookies.username,function(code){
                    if(code != 0){
                        res.json({success:true,error:"Push did not succeed please do a pull first."});
                    }
                    else{
                        git.addAll(rootDir+req.cookies.project+"/"+req.cookies.username,function() {
                            git.commitAll(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
                                git.rebaseInteractive(rootDir+req.cookies.project+"/"+req.cookies.username,files,req.body.comment,function(cliOUT){
                                    var skipCommits = cliOUT.split("|||")[1];
                                    if(skipCommits == "0"){
                                        git.push(rootDir+req.cookies.project+"/"+req.cookies.username,function(code){
                                            res.json({success:true});
                                            git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict) {
                                                git.filesNotPushed(rootDir + req.cookies.project + "/" + req.cookies.username, false, function (filesNotPushed) {
                                                    if (filesNotPushed == "" && filesInConflict == "") {
                                                        git.reset(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
                                                        });
                                                    }
                                                    git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function() {});
                                                });
                                            });
                                        })
                                    }
                                    else{
                                        git.pushSkipCommits(rootDir+req.cookies.project+"/"+req.cookies.username,skipCommits,function(code){
                                            res.json({success:true});
                                            git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict) {
                                                git.filesNotPushed(rootDir + req.cookies.project + "/" + req.cookies.username, false, function (filesNotPushed) {
                                                    if (filesNotPushed == "" && filesInConflict == "") {
                                                        git.reset(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
                                                        });
                                                    }
                                                    git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function() {});
                                                });
                                            });

                                        })
                                    }
                                })
                            });
                        });
                    }
                });
            });
        });
        /*
        git.addAll(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
            git.commitAll(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                git.push(rootDir+req.cookies.project+"/"+req.cookies.username,function(code){
                    res.contentType('json');
                    if(code != 0){
                        res.json({success:true,error:"Push did not succeed please do a pull first."});
                    }
                    else{
                        res.json({success:true});
                    }
                });
            });
        });
        */
    })
};

function isProjectRemote(name,callback){
    var app =  require('../common');
    var db = app.getDB();
    db.collection('projects', function(err, collection) {
        collection.findOne({name:name},{},function(err,project){
            callback(project.externalRepo,project.externalRepoURL);
        })
    })
}

exports.scriptsPull = function(req,res) {

    var handleConflictsAndPip = function(cliOut){
        git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict){
            var files = [];
            if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
            }
            handleConflicts(rootDir+req.cookies.project+"/"+req.cookies.username,files,function(nonBinaryFiles){
                if(cliOut.indexOf("PipRequirements ") != -1){
                    var uninstallAll = false;
                    fs.readFile(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements","utf8",function(err,data){
                        if(!data.match(/[^\W_]/)){
                            uninstallAll = true;
                        }
                        script.runPip(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements",uninstallAll,req.cookies.username,function(freezeData){
                            res.contentType('json');
                            res.json({success:true,conflicts:nonBinaryFiles});
                            realtime.emitMessage("PythonRequirementRun"+req.cookies.username,{freezeData:freezeData});
                        })
                    });

                }
                else{
                    res.contentType('json');
                    res.json({success:true,conflicts:nonBinaryFiles});
                }
                //try and delete jar file to trigger compile from execution
                try{
                    git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function() {});
                    fs.unlink(rootDir+req.cookies.project+"/"+req.cookies.username+"/build/jar/"+req.cookies.project+".jar",function(err){});
                }
                catch(err){}
            })
        });
    };

    var handleMerges = function(cliOut,remote,callback){
        var index = cliOut.indexOf("Your local changes to the following files would be overwritten by merge:\n");

        if(index != -1){
            var n2 = cliOut.indexOf("Please, commit");
            var conflictingFiles = cliOut.substring(index+74,n2).split("\n");
            conflictingFiles.pop();
            var count = 0;
            conflictingFiles.forEach(function(file){
                git.commit(rootDir + req.cookies.project + "/" + req.cookies.username,file,"merge commit",function(){
                    count++;
                    if(count == conflictingFiles.length){
                        if(remote == true){
                            //git.pullRemote(rootDir + req.cookies.project + "/" + req.cookies.username,'remoteRepo', req.cookies.username,function (cliOut) {
                            git.pullRemote(rootDir + req.cookies.project + "/" + req.cookies.username,'remoteRepo', "master",function (cliOut) {
                                callback(cliOut);
                            });
                        }
                        else{
                            git.pull(rootDir + req.cookies.project + "/" + req.cookies.username,function(cliOut){
                                callback(cliOut);
                            })
                        }
                    }
                })
            })
        }
        else{
            callback(cliOut);
        }
    };

    git.filesInConflict(rootDir + req.cookies.project + "/" + req.cookies.username, function (filesInConflict) {
        if (filesInConflict != "") {
            res.json({
                success: true,
                conflicts: [],
                error: "Unable to pull.  You still have unresoved conflicts.\n" + filesInConflict
            });
            return;
        }
        //git.addAll(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
            //git.commitAll(rootDir + req.cookies.project + "/" + req.cookies.username, function () {
            isProjectRemote(req.cookies.project,function(remote,externalRepoURL){
                    if(remote == true){
                        //git.createBranch(rootDir + req.cookies.project + "/" + req.cookies.username,req.cookies.username,function(){
                            //git.pullRemote(rootDir + req.cookies.project + "/" + req.cookies.username,'remoteRepo', req.cookies.username,function (cliOut) {
                            git.pullRemote(rootDir + req.cookies.project + "/" + req.cookies.username,'remoteRepo', 'master',function (cliOut) {
                                //git.pushRemote(rootDir + req.cookies.project + "/" + req.cookies.username,"remoteRepo",req.cookies.username,function(){
                                    handleMerges(cliOut,true,function(cliOut){
                                        handleConflictsAndPip(cliOut);
                                    });
                                //})
                            });
                        //})
                    }
                    else{
                        git.pull(rootDir + req.cookies.project + "/" + req.cookies.username, function (cliOut) {
                            handleMerges(cliOut,false,function(cliOut){
                                handleConflictsAndPip(cliOut);
                            });
                            //git.gitFetch(rootDir + req.cookies.project + "/" + req.cookies.username, function () {

                                //accept theirs for binary
                            //});
                        });
                    }
            });
            //});
        //});
    });
};


exports.scriptsPull_old = function(req,res){
    git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict){
        if(filesInConflict != ""){
            res.json({success:true,conflicts:[],error:"Unable to pull.  You still have unresoved conflicts.\n"+filesInConflict});
            return;
        }

        git.rebaseAbort(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
            git.rebase(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function() {
                    git.addAll(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                        git.commitAll(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                            git.pull(rootDir+req.cookies.project+"/"+req.cookies.username,function(cliOut){
                                git.gitFetch(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
                                    git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict){
                                        git.filesNotPushed(rootDir+req.cookies.project+"/"+req.cookies.username,false,function(filesNotPushed){
                                            if(filesNotPushed == "" && filesInConflict == ""){
                                                git.reset(rootDir+req.cookies.project+"/"+req.cookies.username,function(){});
                                            }
                                        });
                                        var files = [];
                                        if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                                            files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                                        }
                                        //accept theirs for binary
                                        handleConflicts(rootDir+req.cookies.project+"/"+req.cookies.username,files,function(nonBinaryFiles){
                                            if(cliOut.indexOf("PipRequirements ") != -1){
                                                var uninstallAll = false;
                                                fs.readFile(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements","utf8",function(err,data){
                                                    if(!data.match(/[^\W_]/)){
                                                        uninstallAll = true;
                                                    }
                                                    script.runPip(rootDir+req.cookies.project+"/"+req.cookies.username+"/PipRequirements",uninstallAll,req.cookies.username,function(freezeData){
                                                        res.contentType('json');
                                                        res.json({success:true,conflicts:nonBinaryFiles});
                                                        realtime.emitMessage("PythonRequirementRun"+req.cookies.username,{freezeData:freezeData});
                                                    })
                                                });

                                            }
                                            else{
                                                res.contentType('json');
                                                res.json({success:true,conflicts:nonBinaryFiles});
                                            }
                                            //try and delete jar file to trigger compile from execution
                                            try{
                                                fs.unlink(rootDir+req.cookies.project+"/"+req.cookies.username+"/build/jar/"+req.cookies.project+".jar",function(err){})
                                                git.attachHEAD(rootDir+req.cookies.project+"/"+req.cookies.username,function() {});
                                            }
                                            catch(err){}
                                        })
                                    })
                                });
                            });
                        });
                    });
                });
            });
        });
    })
};

exports.handleConflicts = function(workingDir,files,callback){
    handleConflicts(workingDir,files,callback)
};

//accept theirs for binary files
function handleConflicts(workingDir,files,callback){
    var returnedFiles = [];
    if(files.length == 0){
        git.status(workingDir,function(cliOut){
            var cliFiles = [];
            if ((cliOut != "")&&(cliOut.indexOf("\n") != -1)){
                cliFiles = cliOut.split("\n",cliOut.match(/\n/g).length);
            }
            var matchHead = common.ArrayIndexOf(cliFiles,function(file){
                return file.indexOf("~HEAD") != -1 && file.indexOf("??") != -1;
            });
            if(matchHead != -1){
                var fileName = cliFiles[matchHead].split(" ")[1];
                fileName = fileName.split("~")[0];
                fs.unlink(workingDir+"/"+cliFiles[matchHead].split(" ")[1],function(err){});
                git.resetFile(workingDir,fileName,function() {
                    git.acceptTheirs(workingDir, fileName, function () {
                        git.add(workingDir, fileName, function () {
                            //git.rebaseContinue(workingDir, function (cliOut) {
                                //if (cliOut.indexOf("No changes - did you forget to use 'git add'?") != -1) {
                                //    git.rebaseSkip(workingDir, function () {
                                //        git.filesInConflict(workingDir,function(filesInConflict){
                                //            var files = [];
                                //            if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                                //                files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                                //            }
                                //            handleConflicts(workingDir,files,function(){
                                //callback([])
                                //            })
                                //        })
                                //    });
                                //}
                                //else{
                                    git.filesInConflict(workingDir,function(filesInConflict){
                                        var files = [];
                                        if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                                            files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                                        }
                                        handleConflicts(workingDir,files,function(){
                                            callback([])
                                        })
                                    });
                                //}
                            //});
                        });
                    });
                });
            }
            else{
                callback(files);
            }
        });
        return;
    }

    var i = 1;
    git.isBinary(workingDir,files[0],function(binary){
        if(binary == true){
            git.resetFile(workingDir,files[0],function(){
                git.acceptTheirs(workingDir,files[0],function(){
                    git.add(workingDir,files[0],function(){
                        //git.rebaseContinue(workingDir,function(cliOut){
                            //if(cliOut.indexOf("No changes - did you forget to use 'git add'?") != -1){
                            //    git.rebaseSkip(workingDir,function(){
                            //        git.filesInConflict(workingDir,function(filesInConflict){
                            //            var files = [];
                            //            if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                            //                files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                            //            }
                            //            handleConflicts(workingDir,files,function(){
                            //                callback([])
                            //            })
                            //        })
                            //    })
                            //}
                            //else{
                                git.filesInConflict(workingDir,function(filesInConflict){
                                    var files = [];
                                    if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                                        files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                                    }
                                    handleConflicts(workingDir,files,function(){
                                        callback([])
                                    })
                                });
                            //}
                        //})
                    });
                });
            })
        }
        else{
            callback(files)
        }
    })
}

exports.scriptsGet = function(req, res){
    GetScripts(rootDir+req.cookies.project+"/"+req.cookies.username,req.cookies.project,req.cookies.username,function(data){
        res.contentType('json');
        res.json(data);
        /*
        res.json({
            success: true,
            text: "src",
            cls:"folder",
            expanded: true,
            children: data
        });*/
    });
};

exports.scriptsDelete = function(req, res){
    req.body.forEach(function(script, index, array){
        git.delete(rootDir+req.cookies.project+"/"+req.cookies.username,script.fullpath,function(){
            //git.commit(rootDir+req.cookies.project+"/"+req.cookies.username,"",function(){
                fs.exists(rootDir+req.cookies.project+"/"+req.cookies.username+"/bin",function(exists){
                    if(exists == false){
                        fs.mkdir(rootDir+req.cookies.project+"/"+req.cookies.username+"/bin")
                    }
                });
                fs.exists(rootDir+req.cookies.project+"/"+req.cookies.username+"/src",function(exists){
                    if(exists == false){
                        fs.mkdir(rootDir+req.cookies.project+"/"+req.cookies.username+"/src")
                    }
                });
                fs.exists(rootDir+req.cookies.project+"/"+req.cookies.username+"/External Libraries",function(exists){
                    if(exists == false){
                        fs.mkdir(rootDir+req.cookies.project+"/"+req.cookies.username+"/External Libraries")
                    }
                });
                res.json({error:null});
                //if python delete any unneeded __init__.py files
                return;
                if (script.fullpath.slice(-2) == "py" && script.fullpath.indexOf("__init__.py") == -1){
                    var parentPath = path.resolve(filePath,"../");
                    var finalPath = path.resolve(projectPath+"/src","./");
                    console.log(parentPath);
                    //commit(filePath,function(){
                        callback(null);
                        while(finalPath != parentPath){
                            if(fs.existsSync(parentPath+"/__init__.py") == false){
                                fs.writeFileSync(parentPath+"/__init__.py","",'utf8');
                                //commit(parentPath+"/__init__.py",function(){});
                            }
                            parentPath = path.resolve(parentPath,"../");
                        }
                    //});
                }
            //})
        })
    });

    //DeleteScripts(req.body,function(err){
    //    res.json({error:null});
    //});
};

exports.scriptsCopy = function(req, res){
    //prevent multiple errors from sending
    var sent = false;
    CopyScripts(req.body.scripts,req.body.destDir,rootDir+req.cookies.project+"/"+req.cookies.username,function(err){
        git.add(rootDir+req.cookies.project+"/"+req.cookies.username,".",function(){
            //git.commit(rootDir+req.cookies.project+"/"+req.cookies.username,".",'copy',function(){
                if (sent) return;
                sent = true;
                if (err){
                    res.json({error:err});
                }else{
                    res.json({error:null});
                }
            //});
        });
    });
};

exports.CreateNewProject = function(projectName,language,template,callback){
    var templatePath = "";
    if(language == "Java/Groovy"){

        if (template == "Java Based Selenium") {
            template = "java_project_selenium";
        }
        else{
            template = "java_project";
        }
        //templatePath = path.resolve(__dirname,"../project_templates/"+"multi_test");
        templatePath = path.resolve(__dirname,"../project_templates/"+template);
    }
    var common = require('../common');
    var files = [];
    common.walkDir(templatePath,function(){
        var newProjectPath = path.resolve(__dirname,"../public/automationscripts/"+projectName);
        fs.mkdirSync(newProjectPath);
        var adminBranch = newProjectPath + "/admin";
        fs.mkdirSync(adminBranch);
        var masterBranch = newProjectPath + "/master.git";
        fs.mkdirSync(masterBranch);

        git.initBare(masterBranch,function(){
            git.clone(adminBranch,masterBranch,function(){
                fs.writeFile(newProjectPath + "/admin/.gitignore","build\r\nPythonWorkDir\r\n**/*.pyc\r\n**/__init__.py\r\n.ssh",function(){});
                SetupPython(adminBranch);
                files.forEach(function(file,index,array){
                    var destName = file.replace(templatePath,"");
                    destName = adminBranch+destName;
                    //console.log(destName);

                    if (fs.statSync(file).isDirectory()){
                        fs.mkdirSync(destName);
                    }
                    else{
                        var data = "";
                        if (file.indexOf("build.xml") != -1){
                            data = fs.readFileSync(file,"utf8");
                            data = data.replace('<project name="ProjectName"','<project name="'+ projectName +'"');
                        }
                        else{
                            data = fs.readFileSync(file);
                        }
                        fs.writeFileSync(destName,data);
                    }
                });

                git.add(adminBranch,".",function(){
                    git.commit(adminBranch,"","new project",function(){
                        git.push(adminBranch,function(){
                            users.getAllUsers(function(users){
                                console.log('--eval var projectName="'+projectName+'" '+path.resolve(__dirname,"../project_templates/"+template+".js"));
                                var mongoScript = spawn(path.resolve(__dirname,'../vendor/MongoDB/bin/mongo'),['--eval','var projectName="'+projectName+'"',path.resolve(__dirname,"../project_templates/"+template+".js")],{cwd: path.resolve(__dirname,'../vendor/MongoDB/bin'),timeout:300000});
                                //var mongoScript = spawn(path.resolve(__dirname,'../vendor/MongoDB/bin/mongo.exe'),['--eval','localhost:27017/automationframework','var projectName="'+projectName+'"',path.resolve(__dirname,"../project_templates/"+template+".js")],{cwd: path.resolve(__dirname,'../vendor/MongoDB/bin'),timeout:300000});
                                mongoScript.stdout.on('data', function (data) {
                                    common.logger.info(data.toString());
                                });

                                mongoScript.stderr.on('data', function (data) {
                                    common.logger.error('stderr: ' + data.toString());
                                });

                                mongoScript.on('exit', function (code) {
                                    callback();
                                });
                                users.forEach(function(user){
                                    if (user.username !== "admin"){
                                        fs.mkdirSync(newProjectPath + "/" + user.username);
                                        SetupPython(newProjectPath + "/" + user.username);
                                        git.clone(newProjectPath + "/" + user.username,masterBranch,function(){
                                            if(fs.existsSync(newProjectPath + "/" + user.username + "/src") == false){
                                                fs.mkdirSync(newProjectPath + "/" + user.username + "/src");
                                            }
                                            if(fs.existsSync(newProjectPath + "/" + user.username + "/" +"bin") == false){
                                                fs.mkdirSync(newProjectPath + "/" + user.username + "/" +"bin");
                                            }
                                            git.setGitUser(newProjectPath + "/" + user.username,user.username,user.email);
                                            fs.writeFile(newProjectPath + "/" + user.username+"/.gitignore","build\r\nPythonWorkDir\r\n**/*.pyc\r\n**/__init__.py\r\n.ssh",function(){
                                                git.addAll(newProjectPath + "/" + user.username,function(){
                                                    git.commitAll(newProjectPath + "/" + user.username,function(){
                                                        git.push(newProjectPath + "/" + user.username,function(){})
                                                    })
                                                })
                                            });
                                        });
                                    }
                                });
                            });
                        })
                    })
                });
            });
        });


    },function(file){files.push(file)})
};

exports.setupPython = function(userFolder,callback){SetupPython(userFolder,callback)};

function SetupPython(userFolder,callback){
    var python;
    if(process.platform == "win32"){
        python = spawn("cmd.exe",["/K"]);

        python.stdin.write("cd \""+path.resolve(__dirname,'../vendor/Python')+"\"\r\n");
        python.stdin.write("for %I in (.) do cd %~sI\r\n");
        python.stdin.write('python Lib/site-packages/virtualenv.py "'+userFolder+ '/PythonWorkDir"\r\n');
        //python.stdin.end();
        //python.disconnect();
        //python  = python.stdin.write(path.resolve(__dirname,'../vendor/Python/Scripts/virtualenv.exe'),['PythonWorkDir'],{cwd: userFolder,timeout:300000});
    }
    else{
        python  = spawn(path.resolve(__dirname,'../vendor/Python/python'),[path.resolve(__dirname,'../vendor/Python/Lib/site-packages/virtualenv.py'),'PythonWorkDir'],{cwd: userFolder,timeout:300000});
    }
    var cliData = "";

    python.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        if(cliData.indexOf("done.") != -1){
            python.stdin.end();
            //python.disconnect();
        }
        //common.logger.info('stdout: ' + data);
    });

    python.stderr.on('data', function (data) {
        common.logger.error('Setup Python Scripts stderr: ' + data);
    });

    python.on('close', function (code) {
        //fs.writeFile(userFolder + "/" + ".gitignore","Scripts");
        //callback(cliData);
        if(callback)callback();
    });

}

function CopyScripts(scripts,destDir,projectDir,callback){
    var errFound = false;
    var lastLoop = false;
    scripts.forEach(function(script, index, array){
        if (errFound){
            return;
        }
        if (index == array.length -1){
            lastLoop = true;
        }
        if (fs.statSync(script).isDirectory()){
            var DirName = script.substring(script.lastIndexOf("/")+1,script.length);
            DirName = destDir+"/"+DirName;
            if (fs.existsSync(DirName)){
                callback("Directory:" +DirName+" already exists.");
                errFound = true;
                return;
            }
            fs.mkdirSync(DirName);

            var walker = walk.walkSync(script);
            var files = [];
            walker.on("file", function (root, fileStats, next) {
                files.push({from:script+"/"+fileStats.name,to:DirName + "/"+fileStats.name});
                next();
            });

            walker.on("directories", function (root, dirs, next) {
                dirs.forEach(function(dir){
                    var writeDir = DirName + "/" + dir.name;
                    fs.mkdirSync(writeDir);
                });
                next();
            });
            walker.on("end", function () {
                //console.log(files);
                var count = 0;
                files.forEach(function(file,index){
                    fs.readFile(file.from,function(err,data){
                        fs.writeFileSync(file.to,data);
                        count++;
                        if(count == files.length){
                            if(lastLoop)callback();
                        }
                    })
                });

            });


                /*
                common.walkDir(script,function(){if(lastLoop)callback();},function(file){

                    if(fs.statSync(file).isDirectory()){
                        var writeDir = DirName + file.replace(script,"");
                        fs.mkdirSync(writeDir);
                    }
                    else{
                        fs.readFile(file,function(err,data){
                            var writeDir = DirName + file.replace(script,"");
                            if (err){
                                callback(err);
                                errFound = true;
                                return;
                            }
                            fs.writeFile(writeDir,data,function(err){
                                if (err){
                                    callback(err);
                                    errFound = true;
                                }
                                else{
                                    git.add(projectDir,writeDir,function(){
                                        git.commit(projectDir,writeDir,function(){
                                            //callback(null)
                                        });
                                    });
                                }
                            });
                        })
                    }
                });
                */
        }
        else{
            var data = fs.readFileSync(script);

            var name = script.substring(script.lastIndexOf("/")+1,script.length);
            if (fs.existsSync(destDir+"/"+name)){
                callback("File:" +destDir+"/"+name+" already exists.");
                errFound = true;
                return;
            }
            fs.writeFile(destDir+"/"+name,data,function(err){
                if (err){
                    callback(err);
                    errFound = true;
                    return;
                }
                else{
                    git.add(projectDir,destDir+"/"+name,function(){
                        //git.commit(projectDir,destDir+"/"+name,'copy',function(){
                            //callback(null)
                            if((lastLoop)&& (errFound == false)){
                                callback();
                            }
                        //});
                    });
                }
            });

        }
    });
}

function GetScripts(rootDir,project,user,callback){
    git.filesInConflict(rootDir,function(filesInConflict){
        isProjectRemote(project,function(remote,externalRepoURL){
            var repo = "origin/master";
            if(remote == true){
                repo = "remotes/remoteRepo/"+user
            }

            git.filesNotPushed(rootDir,false,repo,function(filesNotPushed){
                var files = [];
                if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                    files = filesInConflict.split("\n",filesInConflict.match(/\n/g).length);
                }

                var filesNP = [];
                if ((filesNotPushed != "")&&(filesNotPushed.indexOf("\n") != -1)){
                    filesNP = filesNotPushed.split("\n",filesNotPushed.match(/\n/g).length);
                }
                walkDir(rootDir,files,filesNP, function(err, results) {
                    if (err) {
                        callback({error:err});
                    }
                    else{
                        //images.getImages(project,function(images){
                            //results.push({name:"Images",fileType:"folder",text:"Images",children:images});
                            callback(results);
                        //});
                    }
                });
            });
        });
    });
}

function DeleteScripts(scripts,callback){
    scripts.forEach(function(script, index, array){
        git.delete();
        if (script.cls == "folder"){
            var toDelete = [];
            common.walkDir(script.fullpath,function(){
                toDelete.reverse();
                toDelete.push(script.fullpath);
                toDelete.forEach(function(file,index,array){
                    if (fs.statSync(file).isDirectory()){
                        fs.rmdirSync(file);
                    }
                    else{
                        fs.unlinkSync(file);
                    }
                });
            },function(file){
                toDelete.push(file);
            });
        }
        else{
            fs.unlinkSync(script.fullpath);
        }
        if (index == array.length -1){
            var gitInfo = git.getGitInfo(script.fullpath);
            git.delete(gitInfo.path,function(){
                callback();
            });
        }
    });
}

function DeleteScripts_old(scripts,callback){
    scripts.forEach(function(script, index, array){
        if (script.cls == "folder"){
            var toDelete = [];
            common.walkDir(script.fullpath,function(){
                toDelete.reverse();
                toDelete.push(script.fullpath);
                toDelete.forEach(function(file,index,array){
                    if (fs.statSync(file).isDirectory()){
                        fs.rmdirSync(file);
                    }
                    else{
                        fs.unlinkSync(file);
                    }
                });
            },function(file){
                toDelete.push(file);
            });
        }
        else{
            fs.unlinkSync(script.fullpath);
        }
        if (index == array.length -1){
            var gitInfo = git.getGitInfo(script.fullpath);
            git.delete(gitInfo.path,function(){
                callback();
            });
        }
    });
}


var walkDir = function(dir,filesInConflict,filesNotPushed, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            var result = {};
            result.text = file;
            result.name = file;
            result.fullpath = dir + '/' + file;
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    //ignore .git dirs
                    if ((file.indexOf(".ssh", file.length - 4) !== -1)||(file.indexOf(".git", file.length - 4) !== -1)||((file.indexOf("build", file.length - 5) !== -1)&&(file.indexOf("src/") == -1))){
                        if (!--pending) done(null, results);
                        return;
                    }
                    if (result.text == "External Libraries"){
                        result.icon = 'images/library.png';
                        result.fileType = "libs";
                    }
                    else{
                        result.fileType = "folder";
                        result.cls = "folder";
                    }

                    if(result.text != "PythonWorkDir"){
                        results.push(result);
                        walkDir(file, filesInConflict,filesNotPushed,function(err, res) {
                            result.children = res;
                            if (!--pending) done(null, results);
                        });
                    }
                    else{
                        if (!--pending) done(null, results);
                    }
                } else {
                    //if (filesInConflict.indexOf(result.text))
                    var match = common.ArrayIndexOf(filesInConflict,function(a){
                        if(result.fullpath.indexOf(a) != -1){
                            return true
                        }
                        else{
                            return false
                        }
                    });
                    if (match != -1){
                        result.text = '<span style="color:red">' + result.text + '</span>';
                        result.qtip = 'This file is in conflict!\r\nPlease resolve.';
                        result.inConflict = true;
                    }
                    else{
                        match = common.ArrayIndexOf(filesNotPushed,function(a){
                            if(result.fullpath.indexOf(a) != -1){
                                return true
                            }
                            else{
                                return false
                            }
                        });
                        if (match != -1){
                            result.text = '<span style="color:blue">' + result.text + '</span>';
                            result.qtip = 'This file is not yet pushed.';
                        }
                    }
                    result.fileType = "file";
                    result.icon = getFileTypeIcon(file);
                    result.leaf= true;
                    if (file.slice(-3) == "pyc"){
                        if (!--pending) done(null, results);
                        return;
                    }
                    if (file.slice(-11) == "__init__.py"){
                        if (!--pending) done(null, results);
                        return;
                    }
                    results.push(result);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

function getFileTypeIcon(file){
    var icon = "";

    if (file.slice(-6) == "groovy"){
        icon = "images/fileTypeGroovy.png";
    }else if (file.slice(-4) == "java"){
        icon = "images/fileTypeJava.png";
    }else if (file.slice(-2) == "js"){
        icon = "images/fileTypeJavascript.png";
    }else if (file.slice(-2) == "py"){
        icon = "images/python.png";
    }else if (file.slice(-2) == "cs"){
        icon = "images/csharp.png";
    }
    return icon;
}
