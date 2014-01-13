var fs = require('fs');
GridStore = require('mongodb').GridStore;
MongoDB = require('mongodb');
var multiparty = require('multiparty');

exports.Post = function(req, res){
    var db = require('../common').getDB();
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        var tmp_path = files.file[0].path;
        var id = files.file[0].originalFilename;
        //console.log(tmp_path);
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
    });

    /*
    var tmp_path = req.files.file.path;
    res.download("c://temp//test.pnf");
    //req.download("test.pnf");
    var id = req.files.file.name;
    console.log(tmp_path);
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
    */

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
                res.end("Error: file not found.", "utf8");
            }
            //fs.writeFile("c:/tmp/image.png",file.file.buffer,{encoding:"binary"},function(){
            //    console.log("all done")
            //})
        })
    });
};