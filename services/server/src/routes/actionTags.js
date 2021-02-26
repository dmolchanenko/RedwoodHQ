var realtime = require("./realtime");
var ObjectID = require('mongodb').ObjectID;

exports.actionTagsGet = function(req, res){
    var app =  require('../common');
    GetActionTags(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            tags: data
        });
    });
};

exports.actionTagsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateActionTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
        returnData.forEach(function(data){
            realtime.emitMessage("AddActionTags",data);
        });
    });
};

function CreateActionTags(db,data,callback){
    db.collection('actionTags', function(err, collection) {
        collection.findOne({project:data.project,value:data.value},{},function(err,foundTag){
            if (!foundTag){
                data._id = new ObjectID(data._id);
                collection.insert(data, {safe:true},function(err,returnData){
                    callback(returnData);
                });
            }
            else{
                callback([foundTag]);
            }
        });
    });
}

function DeleteActionTags(db,data,callback){
    db.collection('actionTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            realtime.emitMessage("DeleteActionTags",data);
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetActionTags(db,query,callback){
    var tags = [];
    db.collection('actionTags', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, tag) {
                if(tag == null) {
                    callback(tags);
                }
                tags.push(tag);
            });
        })
    })
}

exports.CleanUpActionTags = function(req){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('actions', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({project:req.cookies.project,tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteActionTags(db,{value:tag.value,project:req.cookies.project});
                    }
                });
            });
        });
    };
    GetActionTags(db,{project:req.cookies.project},callback);
};