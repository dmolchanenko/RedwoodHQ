exports.executionsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    //data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    UpdateExecutions(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executions: req.body
        });
    });
    var Tags = require('./executionTags');
    Tags.CleanUpExecutionTags(req);
};

exports.executionsGet = function(req, res){
    var app =  require('../common');
    GetExecutions(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            executions: data
        });
    });
};

exports.executionsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    //var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteExecutions(app.getDB(),{_id: req.params.id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executions: []
        });
    });
    var Tags = require('./executionTags');
    Tags.CleanUpExecutionTags(req);
};

exports.executionsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    //delete data._id;
    data.project = req.cookies.project;
    CreateExecutions(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            executions: returnData
        });
    });
};

function CreateExecutions(db,data,callback){
    db.collection('executions', function(err, collection) {
        //data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateExecutions(db,data,callback){
    db.collection('executions', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteExecutions(db,data,callback){
    db.collection('executions', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            db.collection('executiontestcases', function(err, collection) {
                collection.remove({executionID:data._id},{safe:true},function(err) {
                    callback(err);
                });
            });
        });
    });

}

function GetExecutions(db,query,callback){
    var executions = [];

    db.collection('executions', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, execution) {
                if(execution == null) {
                    callback(executions);
                    return;
                }
                executions.push(execution);
            });
        })
    })
}