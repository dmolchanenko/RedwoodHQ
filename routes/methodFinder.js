var fs = require('fs');
var path = require('path');
var common = require('../common');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var appDir = path.resolve(__dirname,"../")+"/";
var spawn = require('child_process').spawn;

exports.methodFinderPost = function(req,res){
    var path = "";
    if(req.body.node == "root"){
        path = rootDir+req.cookies.project+"/"+req.cookies.username+"/src";
        FindFiles(path,function(files){
            res.contentType('json');
            res.json([{text:"src",fullpath:path,expanded:true,children:files}]);
        });
    }
    else if (req.body.node.slice(-6) == ".class"){
        var filepath = req.body.node.substring(0,req.body.node.lastIndexOf("/"));
        var classname = req.body.node.substring(req.body.node.lastIndexOf("/")+1,req.body.node.length);
        classname = classname.replace(".class","");
        FindMethods(filepath,classname,rootDir+req.cookies.project+"/"+req.cookies.username,function(methods){
            res.contentType('json');
            res.json(methods);
        });
    }
    else if ((req.body.node.slice(-6) == "groovy")||(req.body.node.slice(-4) == "java") ||(req.body.node.slice(-2) == "py")||(req.body.node.slice(-2) == "cs")){
        FindClasses(req.body.node,rootDir+req.cookies.project+"/"+req.cookies.username,function(classes){
            res.contentType('json');
            res.json(classes);
        });
    }
    else{
        FindFiles(req.body.node,function(files){
            res.contentType('json');
            res.json(files);
        });
    }
};


function FindFiles(path,callback){
    fs.readdir(path, function(err, list) {
        if (!list){
        //    res.contentType('json');
        //    res.json({error:err});
            return;
        }
        var files = [];
        for(var i=0;i<list.length;i++){
            var result = {};
            result.text = list[i];
            result.fullpath = path + '/' + list[i];
            if (!fs.statSync(path + '/'+list[i]).isDirectory()){
                if (list[i].slice(-6) == "groovy"){
                    result.icon = "images/fileTypeGroovy.png";
                }else if (list[i].slice(-4) == "java"){
                    result.icon = "images/fileTypeJava.png";
                } else if (list[i].slice(-2) == "py"){
                    result.icon = "images/python.png";
                } else if (list[i].slice(-2) == "cs"){
                    result.icon = "images/csharp.png";
                }
                else{
                    result.leaf = true;
                }
                result.type = "file";
            }
            else{
                result.type = "directory";
            }
            if(result.text != "__init__.py" && result.text.slice(-4) != ".pyc"){
                files.push(result);
            }
            if(i+1 === list.length){
                callback(files);
            }
        }
    });
}


function FindClasses(path,projectPath,callback){
    var classes = [];
    var err = false;
    var proc;
    if (path.slice(-2) == "py"){
        proc = spawn(projectPath+"/PythonWorkDir/Scripts/python",[appDir+'utils/codeparser.py',"MethodList",path,"class"],{env:{PYTHONPATH:projectPath+"/src"}});
    }
    else if (path.slice(-2) == "cs"){
        proc = spawn(appDir+"utils/c#parser/CodeParser.exe",["MethodList",path,"class"]);
    }
    else{
        proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"MethodList",path,"class"]);
    }
    proc.stderr.on('data', function (data) {
        common.logger.error(data.toString());
    });
    var cache = "";
    proc.stdout.on('data', function(data) {
        cache = cache + data;
        if (cache.indexOf("\r\n") == -1) return;
        cache.toString().split("\r\n").forEach(function(line,index,array){
            cache = "";
            if (line == "COMPILATION ERROR:"){
                err = true;
            }
            if (line != ''){
                var result = {};
                result.text = line;
                result.fullpath = path + "/" + line + ".class";
                result.type = "class";
                result.icon = "images/class_libraries.png";

                classes.push(result);
            }
        });
        //snapshots.push(data.toString().replace(/\n/g,""));
    });
    proc.on('close', function(){
        if (err == true){
            callback([]);
        }
        else{
            callback(classes);
        }
    });
}

function FindMethods(path,classname,projectPath,callback){
    var methods = [];
    var err = false;
    //var proc = spawn("vendor/Java/bin/java.exe",["-cp",'utils/lib/*;vendor/groovy/*;utils/*',"MethodList",path,classname]);
    //console.log ('"'+appDir+'utils/lib/*'+'"'+';'+'"'+appDir+'vendor/groovy/*'+'"'+';'+'"'+appDir+'utils/*'+'"');
    //var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",'"'+appDir+'utils/lib/*'+'"'+';'+'"'+appDir+'vendor/groovy/*'+'"'+';'+'"'+appDir+'utils/*'+'"',"MethodList",path,classname]);
    var proc;
    if (path.slice(-2) == "py"){
        proc = spawn(projectPath+"/PythonWorkDir/Scripts/python",[appDir+'utils/codeparser.py',"MethodList",path,classname],{env:{PYTHONPATH:projectPath+"/src"}});
    }
    else if (path.slice(-2) == "cs"){
        proc = spawn(appDir+"utils/c#parser/CodeParser.exe",["MethodList",path,classname]);
    }
    else{
        proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"MethodList",path,classname]);
    }
    proc.stderr.on('data', function (data) {
        common.logger.error(data.toString());
    });
    var cache = "";
    proc.stdout.on('data', function(data) {
        cache = cache + data;
        if (cache.indexOf("\r\n") == -1) return;
        cache.toString().split("\r\n").forEach(function(line,index,array){
            cache = "";
            if (line == "COMPILATION ERROR:"){
                err = true;
            }
            if (line != ''){
                var result = {};
                result.text = line;
                result.fullpath = path + "/" + classname + "." + line + ".method";
                result.type = "method";
                result.leaf = true;

                methods.push(result);
            }
        });
        //snapshots.push(data.toString().replace(/\n/g,""));
    });
    proc.on('close', function(){
        if (err == true){
            callback([]);
        }
        else{
            callback(methods);
        }
    });
}