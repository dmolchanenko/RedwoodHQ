var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var baseDir = path.resolve(__dirname,"../");
var common = require('../common');

exports.recordImage = function(req, res){
    res.contentType('json');
    res.json({
        success: true
    });

    var javaPath;
    var classPath;
    if(require('os').platform() == "linux"){
        javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
    }
    else{
        javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java"
    }

    //console.log(javaPath+" -Xmx512m -Djava.library.path="+baseDir+"\\lib -jar ImageAutomation.jar temp.png");
    var recordProc = spawn(javaPath,["-Xmx512m","-Djava.library.path="+baseDir+"\\lib","-jar","ImageAutomation.jar","temp.png"],{env:{PATH:baseDir+"\\lib"},cwd:baseDir});

    recordProc.stderr.on('data', function (data) {
        common.logger.error("error recording: "+data)
    });
    recordProc.on('close', function (code) {
        common.sendFileToServer(baseDir+"/temp.png","temp.png","/recordedimage",common.Config.AppServerIPHost,common.Config.AppServerPort,"username="+req.body.username+";project="+req.body.project,function(){
            fs.unlink(baseDir+"/temp.png");
        })
    });

};
