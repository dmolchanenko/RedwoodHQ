var fs = require('fs');
var p = require('path');
var git = require('../gitinterface/gitcommands');

exports.upload = function(req, res){
    // get the temporary location of the file
    var tmp_path = req.files.file.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = req.body.destDir +"/"+ req.files.file.name;
    res.contentType('text/html');
    fs.exists(target_path,function(exists){
        if (exists){
            res.send('{error:"File already exists."}');
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
                        res.send("{error:null}");
                    });
                });
            });
        });
    });
};