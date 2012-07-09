var fs = require('fs');
var p = require('path');
var rootDir = "public/automationscripts";

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

exports.scriptPut = function(req, res){
    UpdateScript(req.body.path,req.body.text,function(){
        res.json({error:null});
    });
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
    fs.writeFile(path,data,'utf8',function(err){
        if (err) throw err;
        callback();
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
                    callback(null);
                }
            })
        }
        else{
            callback("File already exists.")
        }
    });
}