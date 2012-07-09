var spawn = require('child_process').spawn;
var compileProcs = {};

exports.operation = function(msg, id,callback){
    if (compileProcs[id] != undefined){
        compileProcs[id].proc.kill();
    }
    var buildDir = __dirname.replace("\\routes","")+"/public/automationscripts";
    var antDir = __dirname.replace("\\routes","")+"/ant/bin/";
    compileProcs[id] = {proc:spawn(antDir+'ant.bat',['compile'],{cwd: buildDir,timeout:1800000}),status:"compile"};
    console.log(antDir);
    console.log(buildDir);
    compileProcs[id].proc.stdout.on('data', function(data) {
        //console.log(data.toString());
        callback(data.toString());
    });
    compileProcs[id].proc.on('exit', function(data){
        //if compile is done do build
        //if (compileProcs[id].status == "compile"){
        //    compileProcs[id] = {proc:spawn('ant/bin/ant.bat',['build'],{cwd: "public/automationscripts",timeout:1800000}),status:"build"};
        //}
        //else{
            delete compileProcs[id];
        //}
    });
    callback("");


};