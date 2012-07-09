var fs = require('fs');
var p = require('path');


exports.folderPut = function(req, res){
    UpdateFolder(req.body.path,req.body.newName,function(err){
        if (err){
            res.json({error:err});
        }
        else{
            res.json({error:null});
        }
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
    //new path needs to be a full path
    newName = path.substring(0,path.lastIndexOf("/")+1)+newName;
    fs.rename(path,newName,function(err){
        if (err){
            callback(err.message);
        }
        else{
            callback(null);
        }
    })
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

