var fs = require('fs');
var path = require('path');
var spawn = require('child_process').exec;
//var spawn = require('child_process').spawn;
var baseDir = path.resolve(__dirname,"../lib");
var common = require('../common');
var walk = require('walk');
var http = require("http");

exports.uploadFiles = function(req, res){
    res.contentType('json');
    res.json({
        success: true
    });

    var javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";

    //var proc = spawn(javaPath,["-cp",".","FileChooser"],{env:{PATH:baseDir+"\\lib"},cwd:baseDir});
    var proc = spawn('"'+javaPath+"\" -cp . FileChooser",{env:{PATH:baseDir+"\\lib"},cwd:baseDir});

    var cache = "";
    proc.stdout.on('data', function (data) {
        cache = cache + data.toString();
    });

    proc.stderr.on('data', function (data) {
        common.logger.error("error uploading: "+data.toString())
    });
    proc.on('close', function (code) {
        var destDir = req.body.path;
        if(cache != ""){
            var uploadList = cache.split("|");
            if(uploadList.length == 0){
                sendUploadEnd();
                return;
            }
            var doneWith = 0;
            uploadList.forEach(function(rootPath,index){
                if(rootPath == "") {
                    doneWith++;
                    if(doneWith == uploadList.length){
                        sendUploadEnd(req.body.username);
                    }
                    return;
                }
                var stats = fs.lstatSync(rootPath);
                var names = rootPath.split("/");
                var name = names[names.length - 1];

                if (!stats.isDirectory()) {
                    var dest = destDir + "/"+name;
                    common.sendFileToServer(rootPath,dest,"/uploadfromagent",common.Config.AppServerIPHost,common.Config.AppServerPort,"username="+req.body.username+";project="+req.body.project,function(){
                    });
                    doneWith++;
                    if(doneWith == uploadList.length){
                        sendUploadEnd();
                    }
                    return;
                }
                var walker = walk.walkSync(rootPath);
                var fileCount = 0;
                var files = [];

                var sendFiles = function(){
                    fileCount++;
                    if (!files[fileCount-1]){
                        doneWith++;
                        if(doneWith == uploadList.length){
                            sendUploadEnd(req.body.username);
                        }
                        return;
                    }
                        common.sendFileToServer(files[fileCount-1].file,files[fileCount-1].dest,"/uploadfromagent",common.Config.AppServerIPHost,common.Config.AppServerPort,"username="+req.body.username+";project="+req.body.project,function(){
                            sendFiles();
                        });
                };

                walker.on("file", function (root, fileStats, next) {
                    var path = root.replace(rootPath,"");
                    var dest = "";
                    if (path == ""){
                        dest = destDir +"/"+ name+"/"+fileStats.name;
                    }
                    else{
                        dest = destDir + "/"+name+"/"+ path+"/"+fileStats.name
                    }

                    files.push({file:root+"/"+fileStats.name,dest:dest});
                });

                walker.on("end",function(){
                    sendFiles()
                });
            })
        }
        else{
            sendUploadEnd(req.body.username);
        }
        //common.sendFileToServer(baseDir+"/temp.png","temp.png","/recordedimage",common.Config.AppServerIPHost,common.Config.AppServerPort,"username="+req.body.username+";project="+req.body.project,function(){
        //})
    });

};


function sendUploadEnd(username){
    var options = {
        hostname: common.Config.AppServerIPHost,
        port: common.Config.AppServerPort,
        path: '/uploadfilesdone',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var request = http.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
        });
    });

    request.on('error', function(e) {
    });

    // write data to request body
    request.write(JSON.stringify({username:username}));
    request.end();
}