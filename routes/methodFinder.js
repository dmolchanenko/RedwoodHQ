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
        FindMethods(filepath,classname,function(methods){
            res.contentType('json');
            res.json(methods);
        });
    }
    else if ((req.body.node.slice(-6) == "groovy")||(req.body.node.slice(-4) == "java")){
        FindClasses(req.body.node,function(classes){
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
                }
                else{
                    result.leaf = true;
                }
                result.type = "file";
            }
            else{
                result.type = "directory";
            }
            files.push(result);
            if(files.length === list.length){
                callback(files);
            }
        }
    });
}


function FindClasses(path,callback){
    var classes = [];
    var err = false;
    var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"MethodList",path,"class"]);
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

function FindMethods(path,classname,callback){
    var methods = [];
    var err = false;
    //var proc = spawn("vendor/Java/bin/java.exe",["-cp",'utils/lib/*;vendor/groovy/*;utils/*',"MethodList",path,classname]);
    //console.log ('"'+appDir+'utils/lib/*'+'"'+';'+'"'+appDir+'vendor/groovy/*'+'"'+';'+'"'+appDir+'utils/*'+'"');
    //var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",'"'+appDir+'utils/lib/*'+'"'+';'+'"'+appDir+'vendor/groovy/*'+'"'+';'+'"'+appDir+'utils/*'+'"',"MethodList",path,classname]);
    var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"MethodList",path,classname]);
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