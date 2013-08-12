var fs = require('fs');
var git = require('../gitinterface/gitcommands');
var common = require('../common');
var users = require('./users');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var spawn = require('child_process').spawn;

exports.scriptsPush = function(req,res){
    git.push(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
        res.contentType('json');
        res.json({success:true});
    });
    //GetScripts(rootDir+req.cookies.project+"/"+req.cookies.username,function(data){
};

exports.scriptsPull = function(req,res){
    git.pull(rootDir+req.cookies.project+"/"+req.cookies.username,function(){
        git.filesInConflict(rootDir+req.cookies.project+"/"+req.cookies.username,function(filesInConflict){
            var files = [];
            if ((filesInConflict != "")&&(filesInConflict.indexOf("\n") != -1)){
                files = filesInConflict.split("\n",filesInConflict.match(/\n/).length);
            }
            res.contentType('json');
            res.json({success:true,conflicts:files});
        })
    });
    //GetScripts(rootDir+req.cookies.project+"/"+req.cookies.username,function(data){
};

exports.scriptsGet = function(req, res){
    GetScripts(rootDir+req.cookies.project+"/"+req.cookies.username,function(data){
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
            git.commit(rootDir+req.cookies.project+"/"+req.cookies.username,"",function(){
                res.json({error:null});
            })
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
        if (sent) return;
        sent = true;
        if (err){
            res.json({error:err});
        }else{
            res.json({error:null});
        }
    });
};

exports.CreateNewProject = function(projectName,language,template,callback){
    var templatePath = "";
    if(language == "Java/Groovy"){
        template = "java_project_selenium";
        //if (template == "Selenium") template = "java_project_selenium";
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
                files.forEach(function(file,index,array){
                    var destName = file.replace(templatePath,"");
                    destName = adminBranch+destName;
                    console.log(destName);

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
                    git.commit(adminBranch,"",function(){
                        git.push(adminBranch,function(){
                            users.getAllUsers(function(users){
                                users.forEach(function(user){
                                    if (user.username !== "admin"){
                                        fs.mkdirSync(newProjectPath + "/" + user.username);
                                        git.clone(newProjectPath + "/" + user.username,masterBranch,function(){
                                            if(fs.existsSync(newProjectPath + "/" + user.username + "/" +"src") == false){
                                                fs.mkdirSync(newProjectPath + "/" + user.username + "/" +"src");
                                            }
                                            if(fs.existsSync(newProjectPath + "/" + user.username + "/" +"bin") == false){
                                                fs.mkdirSync(newProjectPath + "/" + user.username + "/" +"bin");
                                            }
                                        });
                                    }
                                });
                                var mongoScript = spawn(path.resolve(__dirname,'../vendor/MongoDB/bin/mongo.exe'),['--eval','var projectName="'+projectName+'"',path.resolve(__dirname,"../project_templates/"+template+".js")],{cwd: path.resolve(__dirname,'../vendor/MongoDB/bin'),timeout:300000})
                                mongoScript.stdout.on('data', function (data) {
                                    console.log('stdout: ' + data);
                                });

                                mongoScript.stderr.on('data', function (data) {
                                    console.log('stderr: ' + data);
                                });

                                mongoScript.on('exit', function (code) {
                                    callback();
                                });
                            });
                        })
                    })
                });
            });
        });


    },function(file){files.push(file)})
};

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
                        git.commit(projectDir,destDir+"/"+name,function(){
                            //callback(null)
                            if((lastLoop)&& (errFound == false)){
                                callback();
                            }
                        });
                    });
                }
            });

        }
    });
}

function GetScripts(rootDir,callback){
    git.filesInConflict(rootDir,function(filesInConflict){
        git.filesNotPushed(rootDir,function(filesNotPushed){
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
                    callback(results);
                }
            });
        });
    });
}

function DeleteScripts(scripts,callback){
    scripts.forEach(function(script, index, array){
        git.delete()
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
                    if ((file.indexOf(".git", file.length - 4) !== -1)||((file.indexOf("build", file.length - 5) !== -1)&&(file.indexOf("src/") == -1))){
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
                    results.push(result);
                    walkDir(file, filesInConflict,filesNotPushed,function(err, res) {
                        result.children = res;
                        if (!--pending) done(null, results);
                    });
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
                    if (file.slice(-6) == "groovy"){
                        result.icon = "images/fileTypeGroovy.png";
                    }else if (file.slice(-4) == "java"){
                        result.icon = "images/fileTypeJava.png";
                    }
                    result.leaf= true;
                    results.push(result);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};
