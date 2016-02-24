var realtime = require('./realtime');
var http = require("http");
var path = require('path');
var fs = require('fs');
var common = require('../common');


exports.recordImage = function(req, res){
    var app =  require('../common');
    var data = req.body;
    var project = req.cookies.project;
    var username = req.cookies.username;
    var ip = req.connection.remoteAddress;

    res.contentType('json');
    res.json({
        success: true
    });

    common.logger.info(ip);
    var options = {
        hostname: ip,
        port: 5009,
        path: '/recordimage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var request = http.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
        });
    });

    request.on('error', function(e) {
        common.logger.info('recordImage problem with request: ' + e.message);
        if (callback) callback("Unable to connect to machine: "+ip + " error: " + e.message);
    });

    // write data to request body
    request.write(JSON.stringify({project:project,username:username}));
    request.end();

};

exports.recordedImage = function(req, res){
    var tmp_path = req.files.file.path;
    var db = require('../common').getDB();
    //var target_path = path.resolve(__dirname,"../public/automationscripts/"+req.cookies.project+"/"+req.cookies.username+"/Images/"+req.files.file.name);
    //console.log(target_path);
    fs.readFile(tmp_path,function(err,data){
        if(!err){
            db.collection('images', function(err, collection) {
                collection.save({file:new MongoDB.Binary(data),tolerance:"0.7",offset:{x:0,y:0},temp:true,project:req.cookies.project}, {safe:true},function(err,returnData){
                    realtime.emitMessage("ImageRecorded"+req.cookies.username,returnData);
                    fs.unlink(tmp_path,function(err){});
                    res.contentType('json');
                    res.json({
                        success: true
                    });
                });
            });
        }
    });
};

exports.saveImage = function(req, res){
    var db = require('../common').getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    //var target_path = path.resolve(__dirname,"../public/automationscripts/"+req.cookies.project+"/"+req.cookies.username+"/Images/"+req.files.file.name);
    //console.log(target_path);
    db.collection('images', function(err, collection) {
        collection.save(data, {safe:true},function(err,returnData){
            res.contentType('json');
            res.json({
                success: true
            });
        });
    });
};

exports.getImages = function(project,callback){
    var db = require('../common').getDB();
    db.collection('images', function(err, collection) {
        var images = [];
        collection.find({project:project,temp:false}, {}, function(err, cursor) {
            cursor.each(function(err, image) {
                if(image == null) {
                    callback(images);
                    return;
                }
                image._id = image._id.toString();
                image.leaf = true;
                image.text = image.name;
                image.fileType = "image";
                image.icon = 'images/monitor_brush.png';
                images.push(image);
            });
        })
    });
};

exports.getImage = function(req, res){
    var db = require('../common').getDB();
    db.collection('images', function(err, collection) {
        collection.findOne({_id:db.bson_serializer.ObjectID(req.params.id)}, {}, function(err, image) {
            if(image != null){
                res.contentType("image/png");
                res.end(image.file.buffer, "binary");
            }
            else{
                res.end("Error: file not found.", "utf8");
            }
        });
    });
};