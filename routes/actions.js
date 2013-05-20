var realtime = require("./realtime");

exports.actionsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    UpdateActions(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateActions",data);
        res.contentType('json');
        res.json({
            success: !err,
            actions: req.body
        });
    });

    var Tags = require('./actionTags');
    Tags.CleanUpActionTags(req);
};

exports.actionsGet = function(req, res){
    var app =  require('../common');
    GetActions(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            actions: data
        });
    });
};

exports.actionsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteActions(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteActions",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            actions: []
        });
    });
    var Tags = require('./actionTags');
    Tags.CleanUpActionTags(req);
};

exports.actionsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateActions(app.getDB(),data,function(returnData){
        realtime.emitMessage("AddActions",data);
        res.contentType('json');
        res.json({
            success: true,
            actions: returnData
        });
    });
};

function CreateActions(db,data,callback){
    db.collection('actions', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateActions(db,data,callback){
    db.collection('actions', function(err, collection) {

        //collection.update({_id:data._id},data,{safe:true},function(err){
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteActions(db,data,callback){
    db.collection('actions', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetActions(db,query,callback){
    var actions = [];

    db.collection('actions', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, action) {
                if(action == null) {
                    callback(actions);
                    return;
                }
                actions.push(action);
            });
        })
    })
}