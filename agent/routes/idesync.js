var fs = require('fs');
var http = require("http");
var os = require('os');
var path = require('path');
var archiver = require('archiver');
var common = require('../common');

exports.syncToRedwoodHQ = function(req,res){

    var project = req.body.project;
    var username = req.body.username;
    var sourceDir = path.join(__dirname, '../idesync/'+project+"/"+username);
    var destPath = os.tmpDir()+"/"+username+"redwoodhqsync.zip";

    fs.exists(sourceDir, function (exists) {
        if(exists == true){
            zipSources(sourceDir,destPath, function (err) {
                if(err){
                    res.json({success:true,error:err});
                }
                else{
                    common.sendFileToServer(destPath,"redwoodhqsync.zip","/sourcesfromagent",common.Config.AppServerIPHost,common.Config.AppServerPort,"username="+username+";project="+project,function(msg){
                        var sent = false;
                        fs.unlink(destPath);
                        if(sent == true) return;
                        sent = true;
                        if(msg && msg.error){
                            res.json({success:true,error:msg.error});
                        }
                        else{
                            res.json({success:true});
                        }
                    });
                }
            });
        }
        else{
            res.json({success:true,error:"Unable to find local IDE files at: "+sourceDir+"<br>Have you synced to your local IDE?"})
        }
    });


};

function zipSources(sourceDir,destPath,callback){
    var output = fs.createWriteStream(destPath);
    var archive = archiver('zip');

    output.on('close', function () {
        output.end();
        callback();
    });

    archive.on('error', function(err){
        common.logger.error(err);
        callback(err);
        output.end();
    });

    archive.pipe(output);
    archive.bulk([
        { expand: true, cwd: sourceDir, src: ['**','!**.idea','!**/.DS_Store','!**/*.pyc','!*.iml','!out','!out/**','!External Libraries/RedwoodHQLauncher.jar']}
    ]);
    archive.finalize();
}



/*
var chokidar = require('chokidar');

var watcher = chokidar.watch('C:/Users/Dmitri/OneDrive/workspace/redwood/agent', {interval:5000,usePolling:true,ignoreInitial:true,ignored: /[\/\\]\./, persistent: true});

watcher
    .on('add', function(path) {console.log('File', path, 'has been added');})
    .on('addDir', function(path) {console.log('Directory', path, 'has been added');})
    .on('change', function(path) {console.log('File', path, 'has been changed');})
    .on('unlink', function(path) {console.log('File', path, 'has been removed');})
    .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
    .on('error', function(error) {console.error('Error happened', error);});
*/