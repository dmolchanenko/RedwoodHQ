var spawn = require('child_process').exec;
var compileProcs = {};
var path = require('path');
var common = require('../common');
var git = require('../gitinterface/gitcommands');

exports.operation = function(msg, id,callback,onFinish){
    if (compileProcs[id] != undefined){
        compileProcs[id].proc.kill();
    }
    var buildDir = path.resolve(__dirname,"../public/automationscripts/"+msg.project)+"/"+msg.username;
    var antDir = path.resolve(__dirname,"../vendor/ant/bin/")+"/";
    var javaDir = path.resolve(__dirname,"../vendor/Java");
    //see if we are dealing with Python or not
    compileProcs[id] = {};
    compileProcs[id].proc =spawn('"'+antDir+'ant" clean compile jar',{cwd: buildDir,timeout:1800000,env:{JAVA_HOME:javaDir}});
    compileProcs[id].status = "compile";
    //compileProcs[id] = {proc:spawn(antDir+'ant.bat',['clean','compile','jar'],{cwd: buildDir,timeout:1800000,env:{JAVA_HOME:javaDir}}),status:"compile"};
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
                    delete compileProcs[id];

                    if (onFinish){
                        onFinish();
                    }
                });
            }
            else{
                delete compileProcs[id];

                if (onFinish){
                    onFinish();
                }
            }
        });
    });
    callback("");


};