var realtime = require("./realtime");

exports.executionsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    //data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    UpdateExecutions(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateExecutions",data);
        res.contentType('json');
        res.json({
            success: !err,
            executions: req.body
        });
        var Tags = require('./executionTags');
        Tags.CleanUpExecutionTags(req);
    });
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
        realtime.emitMessage("DeleteExecutions",{id: req.params.id});
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
    data.user =  req.cookies.username;
    CreateExecutions(app.getDB(),data,function(returnData){
        exports.updateExecutionTotals(returnData._id,function(){
            res.contentType('json');
            res.json({
                success: true,
                executions: returnData
            });
            realtime.emitMessage("AddExecutions",data);
        });
    });
};

exports.updateExecutionTotals = function(executionID,callback){
    var db = require('../common').getDB();
    db.collection('executiontestcases', function(err, collection) {
        collection.aggregate([{$match:{executionID : executionID,baseState:{$ne: true}}},{$group:{_id:null,total:{$sum:"$runtime"}}}],function(err,result){
            var runtime = result[0].total;
            collection.aggregate([{$match:{executionID : executionID,baseState:{$ne: true}}},{$group:{_id:{result:"$result"},count:{$sum:1}}}],function(err,result){
                var failed = 0;
                var passed = 0;
                var total = 0;
                result.forEach(function(result){
                    total = total + result.count;
                    if(result._id.result == "Failed") failed = result.count;
                    if(result._id.result == "Passed") passed = result.count;
                });

                var notRun = total - (failed + passed);

                db.collection('executions', function(err, collection) {
                    collection.findAndModify({_id : executionID},{},{$set:{runtime:runtime,failed:failed,passed:passed,total:total,notRun:notRun}},{safe:true,new:true,upsert:true},function(err,data){
                        if(data != null){
                            realtime.emitMessage("UpdateExecutions",data);
                        }
                        if (callback){
                            callback(err);
                        }
                    });
                });

            });
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