var fs = require('fs');
var path = require('path');
var walk = require('walk');
var common = require('../common');
var spawn = require('child_process').spawn;
var AdmZip = require('adm-zip');
var cacheDir = path.resolve(__dirname,"../cache")+"/";
var fileSync = {};

exports.MatchFile = function(req,res){
    var dirName = getUniqueDirName(req.body.dest);
    //extract file name
    var fileName = req.body.dest.split("/");
    fileName = fileName[fileName.length-1];
    var i = 1;
    var matchFile = function(){
        if(i>5){
            res.send('{"error":null,"success":true,"matched":false}');
            return;
        }
        var fullPath = cacheDir + dirName + "_cache/v"+i+"/" + fileName;
        if(req.body.file.indexOf("pythonSources.zip") != -1){
            res.send('{"error":null,"success":true,"matched":false}');
            return;
        }
        if(fs.existsSync(fullPath) == true){
            if(fs.existsSync(cacheDir + dirName + "_cache/v"+i+"/md5.txt") == false){
                res.send('{"error":null,"success":true,"matched":false}');
                return;
            }

            if(fs.existsSync(cacheDir + dirName + "_cache/v"+i+"/"+fileName) == false){
                res.send('{"error":null,"success":true,"matched":false}');
                return;
            }
            fs.readFile(cacheDir + dirName + "_cache/v"+i+"/md5.txt", function(err, buf) {
                //var md5Value = md5(buf);
                if(buf.toString() == req.body.md5){
                    var target_path = path.resolve(__dirname,"../"+req.body.dest);
                    console.log("COPYING OVER:"+target_path);
                    CreateParentDirs(req.body.dest,function(){
                        copyFile(fullPath,target_path,function(){
                            res.send('{"error":null,"success":true,"matched":true}');
                        })
                    });
                    i = 7;
                }
                else{
                    i++;
                    matchFile();
                }
            });
        }
        else{
            console.log("FALSE I IS:"+fullPath);
            res.send('{"error":null,"success":true,"matched":false}');
        }
    };
    matchFile();
};

function CreateParentDirs(file,callback){
    if (file.indexOf("/") != -1){
        var dirs = file.slice(0,file.lastIndexOf("/"));
        var parent = "";
        dirs.split("/").forEach(function(dir){
            if (fs.existsSync(path.resolve(__dirname,"../"+parent+dir)) == false){
                fs.mkdirSync(path.resolve(__dirname,"../"+parent+dir));
            }
            parent = parent + dir+"/";
        });
    }
    callback();
}

function StoreMD5(file,md5File){
    if (file in fileSync){
        if(fileSync[file].close){
            fileSync[file].destroy();
        }
    }
    var md5sum = require("crypto").createHash('md5');
    var s = fs.ReadStream(file);

    s.on('data',function(d){
        md5sum.update(d);
    });

    s.on("error",function(){
        this.close();
        delete fileSync[file];
    });

    s.on('close',function(){
        delete fileSync[file];
        var d = md5sum.digest('hex');
        fs.writeFile(md5File, d.toString());
    });
}

function getUniqueDirName(fullPath,callback){
    var names = fullPath.split("/");
    var name = "";
    for(var i =2;i<names.length;i++){
        if(name == ""){
            name = names[i];
        }
        else{
            name = name + "." + names[i];
        }
    }
    return name;
}

function SaveToCache(fullPath,target_path){
    var dirName = getUniqueDirName(fullPath);
    var fileName = fullPath.split("/");
    fileName = fileName[fileName.length-1];
    var i;
    for(i=1;i<6;i++){
        if(fs.existsSync(cacheDir + dirName + "_cache/v"+i+"/") == false){
            if(i == 1) fs.mkdirSync(cacheDir + dirName+"_cache");
            fs.mkdirSync(cacheDir + dirName + "_cache/v"+i);
            copyFile(target_path,cacheDir + dirName + "_cache/v"+i+"/"+fileName,function(){
                StoreMD5(cacheDir + dirName + "_cache/v"+i+"/"+fileName,cacheDir + dirName + "_cache/v"+i+"/md5.txt");
            });
            break
        }
    }
    if(i > 5){
        //if(fs.existsSync(cacheDir + fileName + "/v1/"+fileName))fs.unlinkSync(cacheDir + fileName + "/v1/"+fileName);
        var files = fs.readdirSync(cacheDir + dirName+"_cache")
            .map(function(v) {
                return { name:v,
                    time:fs.statSync(cacheDir + dirName+ "_cache/" + v).mtime.getTime()
                };
            })
            .sort(function(a, b) { return a.time - b.time; })
            .map(function(v) { return v.name; });
        var oldestDir = cacheDir + dirName + "_cache/" + files[0];
        try{
            if(fs.existsSync(oldestDir+"/" + fileName)) {fs.unlinkSync(oldestDir+"/" + fileName);}
            if(fs.existsSync(oldestDir+"/md5.txt")) {fs.unlinkSync(oldestDir+"/md5.txt");}
            if(fs.existsSync(oldestDir)) {fs.rmdirSync(oldestDir);}
            fs.mkdirSync(oldestDir);
            copyFile(target_path,oldestDir+"/"+fileName,function(){
                StoreMD5(oldestDir+"/"+fileName,oldestDir + "/md5.txt");
            });
        }
        catch(e){}
    }

}

exports.Post = function(req, res){
    var tmp_path = req.files.file.path;
    var target_path = path.resolve(__dirname,"../"+req.files.file.name);
    common.logger.info(target_path);
    CreateParentDirs(req.files.file.name,function(){
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
                    SaveToCache(req.files.file.name,target_path);
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
                    });
                    SaveToCache(req.files.file.name,target_path);
                }
                else{
                    //create cache
                    res.send("{error:null,success:true}");
                    SaveToCache(req.files.file.name,target_path);
                }
            });
        }
        catch(exception){
            res.send('{error:"'+exception+'"}');
            common.logger.error("EXCEPTION while renaming file:"+target_path+"   "+exception);
        }
    });


    //console.log(tmp_path);
    //console.log(target_path);
};

function copyFile(source, target, cb) {
    var cbCalled = false;
    if (source in fileSync){
        if(fileSync[source].close){
            fileSync[source].destroy();
        }
    }
    else{
        fileSync[source] = true;
    }

    var rd = fs.createReadStream(source);
    fileSync[source] = rd;
    var wr = fs.createWriteStream(target);
    fileSync[target] = wr;

    wr.on("error", function(err) {
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
        this.close();
        rd.destroy.bind(rd);
        done(err);
    });
    wr.on("close", function(ex) {
        done();
        rd.destroy.bind(rd);
    });

    rd.on("close",function(){
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
            fileSync[target].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
    });

    rd.on("error",function(e){
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
            fileSync[target].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
        this.end();
        done(err);
    }).pipe(wr, { end: true });

    function done(err) {
        if(fileSync[source]) {fileSync[source].destroy();delete fileSync[source]}
        if(fileSync[target]) {fileSync[target].destroy();delete fileSync[target]}
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}

function copyFile_old(source, target, cb) {
    if(fullPath in fileSync){
        if(fileSync[file].close){
            fileSync[file].destroy();
        }
    }
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        this.close();
        this.destroy();
        done(err);
    });
    var wr = fs.createWriteStream(target);

    wr.on("error", function(err) {
        this.close();
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });

    rd.on("error",function(e){
        this.end();
        done(err);
    }).pipe(wr, { end: true });

    //rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}