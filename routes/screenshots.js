var fs = require('fs');
GridStore = require('mongodb').GridStore;
MongoDB = require('mongodb');

exports.Post = function(req, res){
    var db = require('../common').getDB();
    var tmp_path = req.files.file.path;
    var id = req.files.file.name;
    fs.readFile(tmp_path,function(err,data){
        if(!err){
            db.collection('screenshots', function(err, collection) {
                collection.save({file:new MongoDB.Binary(data),_id:id}, {safe:true},function(err,returnData){
                    fs.unlink(tmp_path);
                    res.contentType('json');
                    res.json({
                        success: true
                    });
                });
            });
        }
    });

};

exports.Get = function(req, res){
    var db = require('../common').getDB();
    db.collection('screenshots', function(err, collection) {
        collection.findOne({_id:req.params.id}, {},function(err,file){
            if(file != null){
                res.contentType("image/png");
                res.end(file.file.buffer, "binary");
            }
            else{
                res.end("Error: file not found.", "text/html");
            }
            //fs.writeFile("c:/tmp/image.png",file.file.buffer,{encoding:"binary"},function(){
            //    console.log("all done")
            //})
        })
    });
};