exports.resultsGet = function(req, res){
    var db = require('../common').getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    GetTestCases(db,{_id:id},function(testcase){
        res.contentType('json');
        res.json({
            success: true,
            testcase: testcase
        });
    });

    var Tags = require('./actionTags');
    Tags.CleanUpActionTags(req);
};

function GetTestCases(db,query,callback){
    db.collection('testcaseresults', function(err, collection) {
        collection.findOne(query, {}, function(err, testcase) {
            callback(testcase);
        })
    })
}