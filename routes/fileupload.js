var fs = require('fs');
var p = require('path');
var git = require('../gitinterface/gitcommands');
var multiparty = require('multiparty');

exports.upload = function(req, res){
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        if(!files) return;
        // get the temporary location of the file
        var tmp_path = files.file[0].path;
        // set where the file should actually exists - in this case it is in the "images" directory
        var target_path = fields.destDir[0] +"/"+ files.file[0].originalFilename;
        res.contentType('text/html');
        fs.exists(target_path,function(exists){
            if (exists){
                res.send('{error:"File already exists."}');
                fs.unlink(tmp_path,function(err){});
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
                        //git.commit(gitInfo.path,gitInfo.fileName,function(){
                            res.send("{error:null,success:true}");
                        //});
                    });
                });
            });
        });
    });
};