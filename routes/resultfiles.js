var fs = require('fs');
Grid = require('mongodb').Grid;
MongoDB = require('mongodb');

exports.Post = function(req, res){
    var db = require('../common').getDB();
    var tmp_path = req.files.file.path;
    var id = req.files.file.name;
    var gridStore = new Grid(db, id, 'w');

    gridStore.writeFile(tmp_path,function(err, doc){
        fs.unlink(tmp_path);
        res.contentType('json');
        res.json({
            success: true
        });
    });

};

exports.Get = function(req, res){
    var db = require('../common').getDB();

    Grid.read(db, id, function(err, data) {
        if(data){
            res.contentType("application/octet-stream");
            res.end(data, "binary");
        }
        else{
            res.end("Error: file not found.", "utf8");
        }

    });
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