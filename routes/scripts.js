var fs = require('fs');
var common = require('../common');
var git = require('../gitinterface/gitcommands');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";

exports.scriptsGet = function(req, res){
    GetScripts(rootDir+req.cookies.project,function(data){
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
    DeleteScripts(req.body,function(err){
        res.json({error:null});
    });
};

exports.scriptsCopy = function(req, res){
    //prevent multiple errors from sending
    var sent = false;
    CopyScripts(req.body.scripts,req.body.destDir,function(err){
        if (sent) return;
        sent = true;
        if (err){
            res.json({error:err});
        }else{
            res.json({error:null});
        }
    });
};


exports.CreateNewProject = function(projectName,language,callback){
    var templatePath = "";
    if(language == "Java/Groovy"){
        templatePath = path.resolve(__dirname,"../project_templates/java_project");
    }
    var common = require('../common');
    var files = [];
    common.walkDir(templatePath,function(){
        var newProjectPath = path.resolve(__dirname,"../public/automationscripts/"+projectName);
        fs.mkdirSync(newProjectPath);
        files.forEach(function(file,index,array){
            var destName = file.replace(templatePath,"");
            destName = newProjectPath+destName;
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
        callback();

    },function(file){files.push(file)})
};

function CopyScripts(scripts,destDir,callback){
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
            fs.writeFileSync(destDir+"/"+name,data,function(err){
                if (err){
                    callback(err);
                    errFound = true;
                    return;
                }
            });
            if((lastLoop)&& (errFound == false)){
                callback();
            }
        }
    });
}

function GetScripts(rootDir,callback){
    walkDir(rootDir, function(err, results) {
        if (err) {
            callback({error:err});
        }
        else{
            callback(results);
        }
    });
}

function DeleteScripts(scripts,callback){
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


var walkDir = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            var result = {};
            result.text = file;
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
                    walkDir(file, function(err, res) {
                        result.children = res;
                        if (!--pending) done(null, results);
                    });
                } else {
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
