var realtime = require("./realtime");

exports.executionTagsGet = function(req, res){
    var app =  require('../common');
    GetExecutionTags(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            tags: data
        });
    });
};

exports.executionTagsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateExecutionTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
        returnData.forEach(function(data){
            realtime.emitMessage("AddExecutionTags",data);
        });
    });
};

function CreateExecutionTags(db,data,callback){
    db.collection('executionTags', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function DeleteExecutionTags(db,data,callback){
    db.collection('executionTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            realtime.emitMessage("DeleteExecutionTags",data);
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetExecutionTags(db,query,callback){
    var tags = [];
    db.collection('executionTags', function(err, collection) {
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

exports.CleanUpExecutionTags = function(req){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('executions', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({project:req.cookies.project,tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteExecutionTags(db,{value:tag.value,project:req.cookies.project});
                    }
                });
            });
        });
    };
    GetExecutionTags(db,{project:req.cookies.project},callback);
};