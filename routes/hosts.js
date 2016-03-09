var realtime = require("./realtime");
var ObjectID = require('mongodb').ObjectID;

exports.hostsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
    UpdateHosts(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateHosts",data);
        res.contentType('json');
        res.json({
            success: !err,
            hosts: req.body
        });
    });
};

exports.hostsGet = function(req, res){
    var app =  require('../common');
    GetHosts(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            hosts: data
        });
    });
};

exports.hostsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = new ObjectID(req.params.id);
    DeleteHosts(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteHosts",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            hosts: []
        });
    });
};

exports.hostsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateHosts(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            hosts: returnData
        });
        realtime.emitMessage("AddHosts",data);
    });
};

function CreateHosts(db,data,callback){
    db.collection('hosts', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateHosts(db,data,callback){
    db.collection('hosts', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteHosts(db,data,callback){
    db.collection('hosts', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetHosts(db,query,callback){
    var hosts = [];

    db.collection('hosts', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, host) {
                if(host == null) {
                    callback(hosts);
                    return;
                }
                hosts.push(host);
            });
        })
    })
}