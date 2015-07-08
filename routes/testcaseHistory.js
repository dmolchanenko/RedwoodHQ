var ObjectID = require('mongodb').ObjectID;
var realtime = require("./realtime");
var testcasesRoute = require("./testcases");

exports.historyGet = function(req, res){
    var app =  require('../common');
    GetHistory(app.getDB(),{testcaseID:new ObjectID(req.params.id)},function(data){
        //remove last entry since it's a copy of current one anyway
        data.pop();
        res.contentType('json');
        res.json({
            success: true,
            testcases: data
        });
    });
};

exports.historyPost = function(req, res){
    var app =  require('../common');
    GetHistory(app.getDB(),{_id:new ObjectID(req.body.id)},function(testcases){
        var testcase = testcases[0];
        delete testcase.date;
        testcase._id = testcase.testcaseID;
        delete testcase.testcaseID;
        app.getDB().collection('testcases', function(err, collection) {
            collection.save(testcase,{safe:true},function(err){
                if (err) console.warn(err.message);
                realtime.emitMessage("UpdateTestCases",testcase);
                testcasesRoute.SaveHistory(app.getDB(),testcase);
            });
        });
    })
};

function GetHistory(db,query,callback){
    var testcases = [];
    db.collection('testcaseshistory', function(err, collection) {
        collection.find(query, {sort:"date"}, function(err, cursor) {
            cursor.each(function(err, testcase) {
                if(testcase == null) {
                    callback(testcases);
                }
                testcases.push(testcase);
            });
        })
    });
}