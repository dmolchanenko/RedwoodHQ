var spawn = require('child_process').exec;
var compileProcs = {};
var path = require('path');
var common = require('../common');

exports.operation = function(msg, id,callback,onFinish){
    if (compileProcs[id] != undefined){
        compileProcs[id].proc.kill();
    }
    var buildDir = path.resolve(__dirname,"../public/automationscripts/"+msg.project)+"/"+msg.username;
    var antDir = path.resolve(__dirname,"../vendor/ant/bin/")+"/";
    var javaDir = path.resolve(__dirname,"../vendor/Java");
    compileProcs[id] = {proc:spawn('"'+antDir+'ant.bat" clean compile jar',{cwd: buildDir,timeout:1800000,env:{JAVA_HOME:javaDir}}),status:"compile"};
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
        spawn(path.resolve(__dirname,'../vendor/Git/bin/rm.exe'),['-rf',buildDir+"/build"],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
    });
    compileProcs[id].proc.on('close', function(data){

        delete compileProcs[id];

        if (onFinish){
            onFinish();
        }
    });
    callback("");


};