exports.resultsGet = function(req, res){
    var db = require('../common').getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    GetTestCases(db,{_id:id},function(testcase){
        GetLogs(db,{resultID:req.params.id},function(logs){
            res.contentType('json');
            res.json({
                success: true,
                testcase: testcase,
                logs:logs
            });
        });
    });
};

function GetTestCases(db,query,callback){
    db.collection('testcaseresults', function(err, collection) {
        collection.findOne(query, {}, function(err, testcase) {
            callback(testcase);
        })
    })
}

function GetLogs(db,query,callback){
    var logs = [];

    db.collection('executionlogs', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, log) {
                if(log == null) {
                    callback(logs);
                    return;
                }
                logs.push(log);
            });
        })
    })
}