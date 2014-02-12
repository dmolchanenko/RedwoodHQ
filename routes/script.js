var fs = require('fs');
var p = require('path');
var git = require('../gitinterface/gitcommands');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";

exports.scriptGet = function(req, res){
    var sent = false;
    GetScript(req.body.path,function(data){
        if (sent == true) return;
        res.contentType('json');
        if (data.error){
            res.json({error:data});
        }
        else{
            res.json({text:data});
        }
        sent = true;
    });
};

exports.mergeInfo = function(req,res){
    var workDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    var relativePath = req.body.path.replace(workDir+"/","");
    git.showFileContents(workDir,relativePath,"HEAD",function(mine){
        git.showFileContents(rootDir+req.cookies.project+"/"+"master.git",relativePath,"HEAD",function(theirs){
            res.json({mine:mine,theirs:theirs});
        });
    });
};

exports.resolveConflict = function(req, res){
    ResolveConflict(req.body.path,req.body.text,function(){
        res.json({error:null});
    });
};

exports.scriptPut = function(req, res){
    if(req.body.newName){
        git.rename(req.body.path.substring(0,req.body.path.lastIndexOf("/")),req.body.path.substring(req.body.path.lastIndexOf("/")+1,req.body.path.length),req.body.newName,function(){
            res.json({error:null});
        });
    }
    else{
        UpdateScript(req.body.path,req.body.text,function(){
            res.json({error:null});
        });
    }
};

exports.scriptPost = function(req, res){
    CreateScript(req.body.path,req.body.text,function(err){
        if (err){
            res.json({error:err});
        }
        else{
            res.json({error:null});
        }
    });
};

function UpdateScript(path,data,callback){
    if(typeof data != "undefined" ){
        fs.writeFile(path,data,'utf8',function(err){
            if (err) {
                callback({error:err});
                return;
            }
            var gitInfo = git.getGitInfo(path);
            git.commit(gitInfo.path,gitInfo.fileName,function(){
                callback(null)
            });
        })
    }
    else{
        callback(null)
    }
}

function ResolveConflict(path,data,callback){
    fs.writeFile(path,data,'utf8',function(err){
        if (err) {
            callback({error:err});
            return;
        }
        var gitInfo = git.getGitInfo(path);
        git.add(gitInfo.path,gitInfo.fileName,function(){
            git.commit(gitInfo.path,"",function(){
                callback(null)
            });
        });
    })
}

function GetScript(path,callback){
    fs.readFile(path, 'utf8' ,function (err, data) {
        if (err) callback({error:err});
        callback(data);
    });
}

function CreateScript(path,data,callback){
    fs.exists(path,function(exists){
        if (!exists){
            fs.writeFile(path,data,'utf8',function(err){
                if (err){
                    callback(err.message);
                }
                else{
                    var gitInfo = git.getGitInfo(path);
                    git.add(gitInfo.path,gitInfo.fileName,function(){
                        git.commit(gitInfo.path,gitInfo.fileName,function(){
                            callback(null)
                        });
                    });
                }
            })
        }
        else{
            callback("File already exists.")
        }
    });
}