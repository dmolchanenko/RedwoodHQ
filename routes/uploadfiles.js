var realtime = require('./realtime');
var http = require("http");
var path = require('path');
var fs = require('fs');
var common = require('../common');
var git = require('../gitinterface/gitcommands');
var multiparty = require('multiparty');

exports.uploadFromAgent = function(req, res){
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        // get the temporary location of the file
        var tmp_path = files.file[0].path;
        // set where the file should actually exists - in this case it is in the "images" directory
        var target_path = path.resolve(__dirname,"../public/") + "/"+files.file[0].originalFilename;
        res.contentType('text/html');
        fs.exists(target_path,function(exists){
            checkDir(target_path,function(){
                console.log(target_path);
                //return;
                if (exists){
                    res.send('{error:"File already exists."}');
                    fs.unlink(tmp_path);
                    return;
                }
                // move the file from the temporary location to the intended location
                fs.rename(tmp_path, target_path, function(err) {

                    if (err){
                        res.send('{error:"'+err+'"}');
                        return;
                    }
                    // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
                    fs.unlink(tmp_path, function(err) {
                        var gitInfo = git.getGitInfo(target_path);

                        git.add(gitInfo.path,gitInfo.fileName,function(){
                            git.commit(gitInfo.path,gitInfo.fileName,function(){
                                res.send("{error:null,success:true}");
                            });
                        });
                    });
                });
            });
        });
    });
};

function checkDir(filePath,callback){
    var dirs = filePath.split("/");
    var parent = "";
    for(var i = 0;i<dirs.length-1;i++){
        //console.log(parent+dirs[i]);
        if (fs.existsSync(parent+dirs[i]) == false && dirs[i] != ""){
            //make parent dir
            //console.log(parent);
            fs.mkdirSync(parent+dirs[i])
        }
        parent = parent + dirs[i] + "/"
    }
    callback();
}

exports.uploadDone = function(req, res){
    res.send("{error:null,success:true}");
    realtime.emitMessage("FilesUploaded"+req.body.username);
};

exports.uploadFiles = function(req, res){
    var data = req.body;
    var project = req.cookies.project;
    var username = req.cookies.username;
    var ip = req.connection.remoteAddress;

    var options = {
        hostname: ip,
        port: 5009,
        path: '/uploadfiles',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var request = http.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            res.contentType('json');
            res.json({
                success: true
            });
        });
    });

    request.on('error', function(e) {
        common.logger.info('uploadFiles problem with request: ' + e.message);
        res.contentType('json');
        res.json({
            success: false,
            error: "Please download agent to upload directories and files."
        });
        //if (callback) callback("Please download agent to upload directories and files.");
    });

    // write data to request body
    request.write(JSON.stringify({project:project,username:username,path:data.path}));
    request.end();

};