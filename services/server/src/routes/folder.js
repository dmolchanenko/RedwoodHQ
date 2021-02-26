var fs = require('fs');
var p = require('path');
var git = require('../gitinterface/gitcommands');


exports.folderPut = function(req, res){
    UpdateFolder(req.body.path,req.body.newName,function(){
        res.contentType('json');
        res.json({success:true});
    });
};

exports.folderPost = function(req, res){
    CreateFolder(req.body.path,req.body.text,function(err){
        if (err){
            res.json({error:err});
        }
        else{
            res.json({error:null});
        }
    });
};

function UpdateFolder(path,newName,callback){
    git.rename(path.substring(0,path.lastIndexOf("/")),path.substring(path.lastIndexOf("/")+1,path.length),newName,function(){
        callback(null)
    });
}

function CreateFolder(path,data,callback){
    fs.exists(path,function(exists){
        if (!exists){
            fs.mkdir(path,function(err){
                if (err){
                    callback(err.message);
                }
                else{
                    callback(null);
                }
            })
        }
        else{
            callback("Folder already exists.")
        }
    });
}

