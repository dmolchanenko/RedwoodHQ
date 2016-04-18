var realtime = require("./realtime");
var executions = require("./executions");
var ObjectID = require('mongodb').ObjectID;

exports.executionNotes = function(req,res){
    var db = require('../common').getDB();
    var data = req.body;
    //data._id = db.bson_serializer.ObjectID(data._id);
    UpdateNote(db,{_id:data._id},{$set:{note:data.note}},function(data){
        realtime.emitMessage("UpdateExecutionTestCase",data);
    });
    res.contentType('json');
    res.json({
        success: true
    });
};

exports.executiontestcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
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
    var id = new ObjectID(req.params.id);
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

function UpdateNote(db,query,update,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            callback(data);
        });
    });
}

function CreateExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {

        var insertRecords = function(){
            var count = 0;
            for (var i = 0;i<data.length;i++){
                collection.insert(data[i], {safe:true},function(err,returnData){
                    count++;
                    if (count == data.length){
                        realtime.emitMessage("AddExecutionTestCase",data);
                        if (callback) callback();
                    }
                    //callback(returnData);
                });
            }
        };

        //delete updated records first
        var count = 0;
        data.forEach(function(testcase,index){
            if(testcase.updated == true){
                collection.remove({testcaseID:testcase.testcaseID,executionID:testcase.executionID}, {safe:true},function(err,returnData){
                    count++;
                    if (count == data.length){
                        insertRecords();
                    }
                });
            }
            else{
                count++;
                if (count == data.length){
                    insertRecords();
                }
            }
        });
    })
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
                var id = new ObjectID(data.testset);
                collection.findOne({_id:id}, {}, function(err, testset) {
                    var toAdd = testset.testcases.slice(0);
                    testCases.forEach(function(execTC){
                        //var matchedIndex = testset.testcases.indexOf({_id:execTC.testcaseID});
                        var matchedIndex = arrayIndexOf(testset.testcases,function(tc){
                            return execTC.testcaseID === tc._id;
                        });
                        if (matchedIndex == -1){
                            DeleteExecutionTestCases(db,execTC);
                        }
                        else{
                            var matchedToAddIndex = arrayIndexOf(toAdd,function(tc){
                                return execTC.testcaseID === tc._id;
                            });
                            if(matchedToAddIndex != -1){
                                toAdd.splice(matchedToAddIndex,1);
                            }
                        }
                    });
                    db.collection('testcases', function(err, tcCollection) {
                        toAdd.forEach(function(toAddTC){
                            tcCollection.findOne({_id:new ObjectID(toAddTC._id)}, {}, function(err, tc) {
                                if(tc.tcData && tc.tcData.length > 0){
                                        tc.tcData.forEach(function(row,index){
                                            CreateExecutionTestCases(db,[{rowIndex:index,tcData:row,name:tc.name+"_"+index,executionID:executionID,tag:tc.tag,status:"Not Run",testcaseID:toAddTC._id,_id: require("../common").uniqueId()}]);
                                        })
                                }
                                else {
                                    CreateExecutionTestCases(db,[{_id:require("../common").uniqueId(),executionID:executionID,tag:tc.tag,testcaseID:toAddTC._id,status:"Not Run"}])
                                }
                            });
                        });
                        executions.updateExecutionTotals(executionID);
                    });
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