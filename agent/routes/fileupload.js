var fs = require('fs');
var path = require('path');
var walk = require('walk');
var common = require('../common');
var spawn = require('child_process').spawn;
var AdmZip = require('adm-zip');

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
            if(req.files.file.name.indexOf("pythonLibs.zip") != -1){
                var extractTo = path.resolve(__dirname,"../")+"/"+req.files.file.name.substring(0,req.files.file.name.lastIndexOf("/"));
                var zip = new AdmZip(target_path);
                zip.extractAllTo(extractTo, true);
                res.send("{error:null,success:true}");
                //var unzip  = spawn(path.resolve(__dirname,'../../vendor/Java/bin/jar'),['xf','pythonLibs.zip'],{cwd: extractTo,timeout:300000});
            }
            else if(req.files.file.name.indexOf("pythonSources.zip") != -1){
                var extractTo = path.resolve(__dirname,"../")+"/"+req.files.file.name.substring(0,req.files.file.name.lastIndexOf("/"));
                var pythonFileName;
                if(require('os').platform() == "win32"){
                    pythonFileName = "python.exe"
                }
                else{
                    pythonFileName = "python"
                }
                copyFile(path.resolve(__dirname,'../../vendor/Python')+"/"+pythonFileName,path.resolve(extractTo,"../")+"/"+pythonFileName,function(){
                    extractTo = path.resolve(extractTo,"../")+"/src/";
                    var zip = new AdmZip(target_path);
                    zip.extractAllTo(extractTo, true);
                    res.send("{error:null,success:true}");

                    //fs.mkdir(extractTo,function(){
                    //    var unzip  = spawn(path.resolve(__dirname,'../../vendor/Java/bin/jar'),['xf',target_path],{cwd: extractTo,timeout:300000});
                });
            }
            else if(req.files.file.name.indexOf("RedwoodHQAutomation.dll") != -1 ){
                var extractTo = path.resolve(__dirname,"../")+"/"+req.files.file.name.substring(0,req.files.file.name.lastIndexOf("/"));
                copyFile(path.resolve(__dirname,'../lib')+"/CSharpLauncher.exe",path.resolve(extractTo,"../")+"/lib/CSharpLauncher.exe",function(){
                    res.send("{error:null,success:true}");
                })
            }
            else{
               res.send("{error:null,success:true}");
            }
        });
    }
    catch(exception){
        res.send('{error:"'+exception+'"}');
        common.logger.error("EXCEPTION while renaming file:"+target_path+"   "+exception);
    }

    //console.log(tmp_path);
    //console.log(target_path);
};

function copyFile(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        wr.destroy();
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}