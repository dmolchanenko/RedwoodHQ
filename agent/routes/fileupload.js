var fs = require('fs');
var path = require('path');
var walk = require('walk');
var common = require('../common');

exports.Post = function(req, res){
    var tmp_path = req.files.file.path;
    var target_path = path.resolve(__dirname,"../"+req.files.file.name);
    common.logger.info(target_path);

    if (req.files.file.name.indexOf("/") != -1){
        var dirs = req.files.file.name.slice(0,req.files.file.name.lastIndexOf("/"));
        var parent = "";
        dirs.split("/").forEach(function(dir){
            if (fs.existsSync(path.resolve(__dirname,"../"+parent+dir)) == false){
                fs.mkdirSync(path.resolve(__dirname,"../"+parent+dir));
            }
            parent = parent + dir+"/";
        });
    }
    try{
        fs.rename(tmp_path, target_path, function(err) {
            if (err){
                res.send('{error:"'+err+'"}');
                common.logger.error("rename ERROR:"+err);
                fs.unlink(tmp_path);
                return;
            }
            res.send("{error:null,success:true}");
        });
    }
    catch(exception){
        res.send('{error:"'+exception+'"}');
        common.logger.error("EXCEPTION while renaming file:"+target_path+"   "+exception);
    }

    //console.log(tmp_path);
    //console.log(target_path);
};