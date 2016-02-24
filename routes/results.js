exports.resultsGet = function(req, res){
    var db = require('../common').getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    GetTestCases(db,{_id:id},function(testcase){
        //GetLogs(db,{resultID:req.params.id},function(logs){
            if(testcase!= null && testcase.script){
                GetScreenShot(db,{resultID:req.params.id},function(screenshot){
                    res.contentType('json');
                    res.json({
                        success: true,
                        testcase: testcase,
                        screenshot:screenshot
                        //logs:logs
                    });
                })
            }
            else{
                res.contentType('json');
                res.json({
                    success: true,
                    testcase: testcase
                    //logs:logs
                });
            }
        //});
    });
};

exports.logsGet = function(req, res){
    var db = require('../common').getDB();
    GetLogs(db,{resultID:req.params.id},req.params.executionid,function(logs){
        res.contentType('json');
        res.json({
            success: true,
            logs:logs
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

function GetScreenShot(db,query,callback){
    db.collection('screenshots', function(err, collection) {
        collection.findOne(query, {_id:1}, function(err, screenshot) {
            callback(screenshot);
        })
    })
}

function GetLogs(db,query,executionID,callback){
    var logs = [];
    db.collection('executionlogs'+executionID.replace(/-/g, ''), function(err, LogCollection) {
        if(err) {
            callback(logs);
            return;
        }
        LogCollection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, log) {
                if(log == null) {
                    callback(logs);
                    return;
                }
                logs.push(log);
            });
        })
    });
}

function GetLogs_old(db,query,executionID,callback){
    var logs = [];
    db.collection('system.namespaces').find({ name: 'automationframework.executionlogs'+executionID.replace(/-/g, '') }).toArray(function(err, items) {
        var collectionName = "executionlogs";
        if(items.length > 0){
            collectionName = collectionName + executionID.replace(/-/g, '');
        }
        db.collection(collectionName, function(err, collection) {
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
    });
}