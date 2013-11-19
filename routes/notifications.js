var realtime = require("./realtime");

exports.Put = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    UpdateNotifications(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateNotifications",data);
        res.contentType('json');
        res.json({
            success: !err,
            notifications: req.body
        });
    });

    var varTags = require('./variableTags');
    varTags.CleanUpVariableTags(req);
};

exports.Get = function(req, res){
    var app =  require('../common');
    GetNotifications(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            notifications: data
        });
    });
};

exports.Delete = function(req, res){
    var app =  require('../common');
    //DeleteNotifications(app.getDB(),{_id: req.params.id},function(err){
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteNotifications(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteNotifications",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            notifications: []
        });
    });
    var varTags = require('./variableTags');
    varTags.CleanUpVariableTags(req);
};

exports.Post = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateNotifications(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            notifications: returnData
        });
        realtime.emitMessage("AddNotifications",data);
    });
};

function CreateNotifications(db,data,callback){
    db.collection('notifications', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateNotifications(db,data,callback){
    db.collection('notifications', function(err, collection) {

        //collection.update({_id:data._id},data,{safe:true},function(err){
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteNotifications(db,data,callback){
    db.collection('notifications', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetNotifications(db,query,callback){
    var notifications = [];

    db.collection('notifications', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, variable) {
                if(variable == null) {
                    callback(notifications);
                }
                notifications.push(variable);
            });
        })
    })
}