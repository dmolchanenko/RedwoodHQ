var fs = require('fs');
var path = require('path');
var walk = require('walk');

exports.Post = function(req, res){
    var tmp_path = req.files.file.path;
    var target_path = path.resolve(__dirname,"../"+req.files.file.name);

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
    fs.rename(tmp_path, target_path, function(err) {
        if (err){
            res.send('{error:"'+err+'"}');
            console.log("ERROR:"+err);
            fs.unlink(tmp_path);
            return;
        }
        res.send("{error:null,success:true}");
    });

    console.log(tmp_path);
    console.log(target_path);
};