exports.aggregatePost = function(req, res){
    var app =  require('../common');
    var executions = req.body;
    AggregateExecutions(app.getDB(),executions,function(returnData){
        //realtime.emitMessage("AddActions",data);
        res.contentType('json');
        res.json(returnData);
    });
};

function AggregateExecutions(db,executions,callback){
    var aggregateData = [];

    db.collection('executiontestcases', function(err, collection) {
        var count = 0;
        var executionIDs = [];
        executions.forEach(function(execution,index){
            executionIDs.push({executionID:execution._id});
            collection.aggregate([{$match:{executionID : execution._id}},{$group:{_id:{result:"$result"},count:{$sum:1}}}],function(err,result){
                var failed = 0;
                var passed = 0;
                var total = 0;
                result.forEach(function(result){
                    total = total + result.count;
                    if(result._id.result == "Failed") failed = result.count;
                    if(result._id.result == "Passed") passed = result.count;
                });

                var notRun = total - (failed + passed);
                aggregateData.push({name:execution.name,lastRunDate:execution.lastRunDate,tag:execution.tag,id:execution._id,passed:passed,failed:failed,notRun:notRun,total:total});
                count++;
                if(count == executions.length) {
                    db.collection('executiontestcases', function(err, collection) {
                        var testCases = {};
                        collection.find({$or:executionIDs},{executionID:1,testcaseID:1,result:1},function(err,cursor){

                            cursor.each(function(err, testcase) {
                                if(testcase == null) {
                                    callback({aggregateData:aggregateData,testCases:testCases,executionIDs:executionIDs});
                                    return;
                                }
                                var entry = {};
                                entry[testcase.executionID] = testcase.result;
                                if(testCases[testcase.testcaseID]){
                                    testCases[testcase.testcaseID][testcase.executionID] = testcase.result;
                                }
                                else{
                                    testCases[testcase.testcaseID] = {};
                                    if(testcase.result){
                                        testCases[testcase.testcaseID][testcase.executionID] = testcase.result;
                                    }
                                    else{
                                        testCases[testcase.testcaseID][testcase.executionID] = "Not Run";
                                    }

                                }

                            });
                        });
                    });
                }
            })
        });
    })
}