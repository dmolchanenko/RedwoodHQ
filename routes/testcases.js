exports.testcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    UpdateTestCases(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            testcases: req.body
        });
    });

    var Tags = require('./actionTags');
    Tags.CleanUpActionTags(req);
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
        res.contentType('json');
        res.json({
            success: !err,
            testcases: []
        });
    });
    var Tags = require('./testcaseTags');
    Tags.CleanUpActionTags(req);
};

exports.testcasesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
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
        });
    });
}

function UpdateTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
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