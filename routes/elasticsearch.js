var http = require("http");
var host = "localhost";
var port = "9200";
var cache = [];

exports.indexExecution = function(execution){
    return;
    var indexedExec = {};
    indexedExec.tag = execution.tag;
    indexedExec.project = execution.project;
    indexedExec.user = execution.user;
    indexedExec.status = execution.status;
    indexedExec.lastRunDate = execution.lastRunDate;
    indexedExec.notRun = execution.notRun;
    indexedExec.passed = execution.passed;
    indexedExec.failed = execution.failed;
    indexedExec.name = execution.name;
    indexedExec.testsetname = execution.testsetname;

    indexES(host,port,indexedExec,"executions/execution/"+execution._id,"PUT",function(resp){
        console.log(resp);
    })
};

exports.indexTestCase = function(testcase,operation){
    return;
    var indexedTC = {};
    indexedTC.tag = testcase.tag;
    indexedTC.project = testcase.project;
    indexedTC.user = testcase.user;
    indexedTC.status = testcase.status;
    indexedTC.name = testcase.name;

    var indexIt = function(){
        var removed;
        if(cache.length > 0) {
            removed = cache.splice(0);
        }
        else{
            return;
        }
        indexES(host,port,removed[0].indexedTC,"testcases/testcase/"+removed[0]._id,removed[0].operation,function(resp){
            indexIt();
            console.log(resp);
        })
    };

    cache.push({indexedTC:indexedTC,operation:operation,_id:testcase._id});
    if(cache.length == 1){
        indexIt();
    }
    //setTimeout(indexES(host,port,indexedTC,"testcases/testcase/"+testcase._id,operation,function(resp){
    //    console.log(resp);

    //}),200);
    //indexES(host,port,indexedTC,"testcases/testcase/"+testcase._id,operation,function(resp){
    //    console.log(resp);
    //})
};

exports.indexTCResult = function(testcaseResult,operation){
    var indexedTC = {};
    indexedTC.tag = testcaseResult.tag;
    indexedTC.project = testcaseResult.project;
    indexedTC.status = testcaseResult.status;
    indexedTC.result = testcaseResult.result;
    indexedTC.enddate = testcaseResult.enddate;
    indexedTC.name = testcaseResult.name;
    //indexES(host,port,indexedTC,"testcaseresults/testcaseresult/"+testcaseResult._id,operation,function(resp){
    //    console.log(resp);
    //});

    var db = require('../common').getDB();

    db.collection('executions', function(err, collection) {
        collection.findOne({_id:testcaseResult.executionID}, {}, function(err, execution) {
            if(execution != null) {
                indexedTC.executiontag = execution.tag;
                indexES(host,port,indexedTC,"testcaseresults/testcaseresult/"+testcaseResult._id.toString(),"PUT",function(resp){
                    console.log(resp);
                })
            }
        })
    });

};


function indexES(host,port,command,path,operation,callback){
    var options = {
        hostname: host,
        port: port,
        path: path,
        method: operation,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            try{
                var msg = JSON.parse(chunk);
            }
            catch(err){
                if (callback) callback({error:err});
            }

            if((msg )&&(msg.error != null)){
                if (callback) callback({error:msg.error});
            }
            else if (msg){
                if(callback) callback(msg);
            }
            else{
                if(callback) callback();
            }
        });
    });


    req.on('error', function(e) {
        if (callback) callback({error:"Unable to connect to machine: "+agentHost + " error: " + e.message});
    });

    // write data to request body
    req.write(JSON.stringify(command));
    req.end();
}
