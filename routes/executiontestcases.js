var realtime = require("./realtime");
var executions = require("./executions");

exports.executiontestcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateExecutionTestCases(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executiontestcases: req.body
        });
    });
};

exports.executiontestcasesPutArray = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    var count = 0;
    for (var i = 0;i<data.length;i++){
        //data[i]._id = db.bson_serializer.ObjectID(data[i]._id);
        UpdateExecutionTestCases(app.getDB(),data[i],function(err){
            count++;
            if(count == data.length){
                res.contentType('json');
                res.json({
                    success: !err
                });
            }
        });
    }
};

exports.executiontestcasesGet = function(req, res){
    var app =  require('../common');
    GetTestCases(app.getDB(),{executionID:req.params.id},function(data){
        res.contentType('json');
        res.json({
            success: true,
            executiontestcases: data
        });
    });
};

exports.executiontestcasesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteExecutionTestCases(app.getDB(),{_id: id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executiontestcases: []
        });
    });
};

exports.executiontestcasesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    data.forEach(function(testcase){
        testcase.project = req.cookies.project;
    });
    CreateExecutionTestCases(app.getDB(),data,function(){
        executions.updateExecutionTotals(data[0].executionID,function(){
            res.contentType('json');
            res.json({
                success: true
            });
        });
    });
};

function CreateExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        var count = 0;
        for (var i = 0;i<data.length;i++){
            //data[i]._id = db.bson_serializer.ObjectID(data[i]._id);
            collection.insert(data[i], {safe:true},function(err,returnData){
                count++;
                if (count == data.length){
                    realtime.emitMessage("AddExecutionTestCase",data);
                    if (callback) callback();
                }
                //callback(returnData);
            });
        }
    });
}

function UpdateExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            realtime.emitMessage("RemoveExecutionTestCase",{id:data._id,executionID:data.executionID});
            if (callback) callback(err);
        });
    });

}

function GetTestCases(db,query,callback){
    var executiontestcases = [];

    db.collection('executiontestcases', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, execution) {
                if(execution == null) {
                    callback(executiontestcases);
                    return;
                }
                executiontestcases.push(execution);
            });
        })
    })
}

exports.GetExecutionTestCases = function(db,query,callback){
    GetTestCases(db,query,callback);
};

exports.executionsTestSetUpdatePost = function(req, res){
    var db =  require('../common').getDB();
    var arrayIndexOf = require('../common').ArrayIndexOf;
    var data = req.body;
    res.contentType('json');
    res.json({
        success: true
    });

    var updateExecution = function(executionID){
        GetTestCases(db,{executionID:executionID},function(testCases){
            db.collection('testsets', function(err, collection) {
                var id = db.bson_serializer.ObjectID(data.testset);
                collection.findOne({_id:id}, {}, function(err, testset) {
                    testCases.forEach(function(execTC){
                        //var matchedIndex = testset.testcases.indexOf({_id:execTC.testcaseID});
                        var matchedIndex = arrayIndexOf(testset.testcases,function(tc){
                            return execTC.testcaseID === tc._id;
                        });
                        if (matchedIndex == -1){
                            DeleteExecutionTestCases(db,execTC);
                            //toRemove.push(execTC._id);
                        }
                        else{
                            testset.testcases.splice(matchedIndex,1);
                        }
                    });
                    testset.testcases.forEach(function(toAddTC){
                        var id = require("../common").uniqueId();
                        CreateExecutionTestCases(db,[{_id:id,executionID:executionID,testcaseID:toAddTC._id,status:"Not Run"}])
                    });
                    executions.updateExecutionTotals(executionID);
                })
            });
        });
    };

    db.collection('executions', function(err, collection) {
        collection.find({testset:data.testset}, {}, function(err, cursor) {
            cursor.each(function(err, execution) {
                if(execution == null) {
                    return;
                }
                if (execution.locked == true) return;
                updateExecution(execution._id);
            });
        })
    });

};