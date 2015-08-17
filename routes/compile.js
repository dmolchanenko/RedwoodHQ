var spawn = require('child_process').exec;
var compileProcs = {};
var path = require('path');
var common = require('../common');
var git = require('../gitinterface/gitcommands');
var fs = require('fs');

exports.operation = function(msg, id,callback,onFinish){
    if (compileProcs[id] != undefined){
        if(compileProcs[id].proc) compileProcs[id].proc.kill();
        if(compileProcs[id].pythonProc) compileProcs[id].pythonProc.kill();
        if(compileProcs[id].csharpProc) compileProcs[id].csharpProc.kill();
    }
    //if(!msg.java) msg.java = true;
    //if(!msg.python) msg.python = true;
    //if(!msg.csharp) msg.csharp = true;

    var buildDir = path.resolve(__dirname,"../public/automationscripts/"+msg.project)+"/"+msg.username;
    compileProcs[id] = {};
    compileProcs[id].status = "compile";
    compileJava(buildDir,id,msg,callback,function(){
        compilePython(buildDir,id,msg,callback,function(){
            compileCSharp(buildDir,id,msg,callback,function(){
                delete compileProcs[id];
                if (onFinish){
                    onFinish();
                }
            });
        })
    });

    /*
    compileProcs[id].proc =spawn('"'+antDir+'ant" clean compile jar',{cwd: buildDir,timeout:1800000,env:{JAVA_HOME:javaDir}});
    compileProcs[id].status = "compile";
    common.logger.info(antDir);
    common.logger.info(buildDir);
    compileProcs[id].proc.stdout.on('data', function(data) {
        //console.log(data.toString());
        callback(data.toString());
    });

    compileProcs[id].proc.stderr.on('data', function(data) {
        //console.log(data.toString());
        callback(data.toString());
        spawn(path.resolve(__dirname,'../vendor/Git/bin/rm'),['-rf',buildDir+"/build"],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
    });
    compileProcs[id].proc.on('close', function(data){
        compilePython(buildDir,id,callback,function(){
            compileCSharp(buildDir,id,callback,function(){
                delete compileProcs[id];
                if (onFinish){
                    onFinish();
                }
            });
        })
    });
    callback("");
    */
};

function compileJava(buildDir,id,msg,callback,onFinish){
    if(msg.java == false) {
        onFinish();
        return;
    }

    git.lsFiles(buildDir+"/src",["*.groovy","*.java"],function(data) {
        if (data.indexOf(".py") != -1) {

        }
    });
    var antDir = path.resolve(__dirname,"../vendor/ant/bin/")+"/";
    var javaDir = path.resolve(__dirname,"../vendor/Java");
    fs.exists(buildDir+"/ivy.xml",function(exists){
        var resolve = "";
        if(exists == true) resolve = "resolve";
        compileProcs[id].proc =spawn('"'+antDir+'ant" clean '+resolve+' compile jar',{cwd: buildDir,timeout:1800000,env:{ANT_HOME:path.resolve(__dirname,"../vendor/ant/"),JAVA_HOME:javaDir}});
        common.logger.info(antDir);
        common.logger.info(buildDir);
        compileProcs[id].proc.stdout.on('data', function(data) {
            //console.log(data.toString());
            callback(data.toString());
        });

        compileProcs[id].proc.stderr.on('data', function(data) {
            //console.log(data.toString());
            callback(data.toString());
            spawn(path.resolve(__dirname,'../vendor/Git/bin/rm'),['-rf',buildDir+"/build"],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
        });
        compileProcs[id].proc.on('close', function(data){
            onFinish();
        });
        callback("");
    });
}

function compilePython(buildDir,id,msg,callback,onFinish){
    if(msg.python == false) {
        onFinish();
        return;
    }
    git.lsFiles(buildDir+"/src",["*.py"],function(data){
        if(data.indexOf(".py") != -1){
            callback("------------COMPILE PYTHON------------");
            compileProcs[id].pythonProc = spawn('"'+buildDir+'/PythonWorkDir/Scripts/python" -m compileall src',{cwd: buildDir,timeout:1800000,env:{}});
            var failed = false;
            compileProcs[id].pythonProc.stdout.on('data', function(data) {
                //console.log(data.toString());
                if(data.toString().indexOf("SyntaxError") != -1) failed = true;
                if(data.toString().indexOf("IndentationError") != -1) failed = true;
                callback(data.toString());
            });

            compileProcs[id].pythonProc.stderr.on('data', function(data) {
                //console.log(data.toString());
                if(data.toString().indexOf("SyntaxError") != -1) failed = true;
                if(data.toString().indexOf("IndentationError") != -1) failed = true;
                callback(data.toString());
            });
            compileProcs[id].pythonProc.on('close', function(data){
                if(failed == true) {
                    callback("BUILD FAILED");
                }
                else{
                    callback("BUILD SUCCESSFUL");
                }
                if (onFinish){
                    onFinish();
                }
            });
        }
        else{
            if (onFinish){
                onFinish();
            }
        }
    });
}

function compileCSharp(buildDir,id,msg,callback,onFinish){
    if(msg.csharp == false) {
        onFinish();
        return;
    }
    git.lsFiles(buildDir+"/src",["*.cs"],function(data){
        if(data.indexOf(".cs") != -1){
            callback("------------COMPILE C#------------");

            var startCompiling = function(){
                compileProcs[id].csharpProc = spawn(common.MSBuildLocation+' CSharp.proj /t:Compile',{cwd: buildDir,timeout:1800000,env:{}});
                var failed = false;
                compileProcs[id].csharpProc.stdout.on('data', function(data) {
                    //console.log(data.toString());
                    if(data.toString().indexOf("Build FAILED") != -1) failed = true;
                    callback(data.toString());
                });

                compileProcs[id].csharpProc.stderr.on('data', function(data) {
                    //console.log(data.toString());
                    if(data.toString().indexOf("Build FAILED") != -1) failed = true;
                    callback(data.toString());
                });
                compileProcs[id].csharpProc.on('close', function(data){
                    if(failed == true) {
                        callback("BUILD FAILED");
                    }
                    else{
                        callback("BUILD SUCCESSFUL");
                    }
                    if (onFinish){
                        onFinish();
                    }
                });
            };
            if(common.MSBuildLocation == null){common.setNETLocation(function(){
                    startCompiling()
                })
            }
            else{
                startCompiling();
            }
        }
        else{
            if (onFinish){
                onFinish();
            }
        }
    });
}