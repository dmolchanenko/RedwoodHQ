var realtime = require("./realtime");
var ObjectID = require('mongodb').ObjectID;

exports.actionsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    UpdateActions(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            actions: req.body
        });
        realtime.emitMessage("UpdateActions",data);
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


exports.getActionDetails = function(req, res){
    var app =  require('../common');
    var id = new ObjectID(req.params.id);
    GetActionDetails(app.getDB(),{project:req.cookies.project,_id:id},function(data){
        res.contentType('json');
        res.json({
            success: true,
            action: data
        });
    });
};

exports.actionsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = new ObjectID(req.params.id);
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
    data.user =  req.cookies.username;
    CreateActions(app.getDB(),data,function(returnData){
        //realtime.emitMessage("AddActions",data);
        res.contentType('json');
        res.json({
            success: true,
            actions: returnData
        });
    });
};

function CreateActions(db,data,callback){
    db.collection('actions', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
            SaveHistory(db,returnData[0]);
        });
    });
}

function UpdateActions(db,data,callback){
    db.collection('actions', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
            SaveHistory(db,data);
        });
    });
}

exports.SaveHistory = function(db,data){SaveHistory(db,data)};

function SaveHistory(db,data){
    db.collection('actionshistory', function(err, collection) {
        data.actionID = data._id;
        delete data._id;
        data.date = new Date();
        collection.insert(data,{safe:true},function(err,returnData){
            if (err) console.warn(err.message);
        });
    });
}

function DeleteActions(db,data,callback){
    db.collection('actions', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
            db.collection('testcases', function(err, collection) {
                collection.find({collection:{$elemMatch: {actionid:data._id.toString()}}},{_id:1}, function(err, cursor) {
                    cursor.each(function(err, testcase) {
                        if(testcase == null) {
                            return;
                        }
                        collection.update({_id:testcase._id},{$pull: {collection:{actionid:data._id.toString()}}})
                    });
                });
            });
        });
    });

}

function GetActions(db,query,callback){
    var actions = [];

    db.collection('actions', function(err, collection) {
        collection.find(query, {_id:1,tag:1,name:1,params:1}, function(err, cursor) {
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

function GetActionDetails(db,query,callback){
    db.collection('actions', function(err, collection) {
        collection.findOne(query, {}, function(err, testcase) {
            callback(testcase);
        })
    })
}
