var realtime = require("./realtime");
var executions = require("./executions");

exports.testcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    UpdateTestCases(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateTestCases",data);
        res.contentType('json');
        res.json({
            success: !err,
            testcases: req.body
        });
    });

    var Tags = require('./testcaseTags');
    Tags.CleanUpTestCaseTags(req);
};

exports.testcasesGet = function(req, res){
    var app =  require('../common');
    GetTestCases(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            testcases: data
        });
    });
};

exports.testcasesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteTestCases(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteTestCases",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            testcases: []
        });
    });
    var Tags = require('./testcaseTags');
    Tags.CleanUpTestCaseTags(req);
};

exports.testcasesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    CreateTestCases(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            testcases: returnData
        });
    });
};

function CreateTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
            SaveHistory(db,returnData[0]);
        });
    });
}

function UpdateTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
            SaveHistory(db,data);
        });
    });

}

exports.SaveHistory = function(db,data){SaveHistory(db,data)};

function SaveHistory(db,data){
    db.collection('testcaseshistory', function(err, collection) {
        data.testcaseID = data._id;
        delete data._id;
        data.date = new Date();
        collection.insert(data,{safe:true},function(err,returnData){
            if (err) console.warn(err.message);
        });
    });
}

function DeleteTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
            db.collection('executiontestcases', function(err, tccollection) {
                tccollection.find({testcaseID:data._id.toString()},{},function(err,cursor) {
                    cursor.each(function(err,testcase){
                        if(testcase != null){
                            db.collection('executions', function(err, excollection) {
                                excollection.findOne({_id:testcase.executionID,locked:false},{},function(err,execution){
                                    if(execution != null){
                                        tccollection.remove({_id:testcase._id},{safe:true},function(err) {
                                            executions.updateExecutionTotals(testcase.executionID);
                                            realtime.emitMessage("RemoveExecutionTestCase",{id:testcase._id,executionID:testcase.executionID});
                                        });
                                    }
                                })
                            });
                        }
                    });
                });
            });
        });
    });

}

function GetTestCases(db,query,callback){
    var testcases = [];

    db.collection('testcases', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, action) {
                if(action == null) {
                    callback(testcases);
                }
                testcases.push(action);
            });
        })
    })
}