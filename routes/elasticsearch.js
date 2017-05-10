var http = require("http");
var common = require("../common");
var tcCache = [];
var execTcCache = [];

exports.indexExecution = function(execution){
    if(!common.Config.ELKServer || common.Config.ELKServer == "") return;
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
    indexedExec.variables = execution.variables;
    indexedExec.url = "http://"+common.Config.AppServerIPHost+":"+common.Config.AppServerPort+"/index.html?execution="+execution._id+"&project="+execution.project;

    indexES(common.Config.ELKServer,common.Config.ELKServerPort,indexedExec,"executions/execution/"+execution._id,"PUT",function(resp){
        //console.log(resp);
    })
};

exports.indexTestCase = function(testcase,operation){
    if(!common.Config.ELKServer || common.Config.ELKServer == "") return;
    var indexedTC = {};
    indexedTC.tag = testcase.tag;
    indexedTC.project = testcase.project;
    indexedTC.user = testcase.user;
    indexedTC.status = testcase.status;
    indexedTC.name = testcase.name;
    if(indexedTC.lastModified){
        indexedTC.lastModified = testcase.lastModified;
    }

    var indexIt = function(){
        var removed;
        if(tcCache.length > 0) {
            removed = tcCache.splice(0);
        }
        else{
            return;
        }
        indexES(common.Config.ELKServer,common.Config.ELKServerPort,removed[0].indexedTC,"testcases/testcase/"+removed[0]._id,removed[0].operation,function(resp){
            indexIt();
            //console.log(resp);
        })
    };

    tcCache.push({indexedTC:indexedTC,operation:operation,_id:testcase._id});
    if(tcCache.length == 1){
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
    if(!common.Config.ELKServer || common.Config.ELKServer == "") return;
    var indexedTC = {};
    indexedTC.tag = testcaseResult.tag;
    indexedTC.project = testcaseResult.project;
    indexedTC.status = testcaseResult.status;
    indexedTC.result = testcaseResult.result;
    indexedTC.enddate = testcaseResult.enddate;
    indexedTC.name = testcaseResult.name;
    var db = require('../common').getDB();

    var indexIt = function(){
        var removed;
        if(execTcCache.length > 0) {
            removed = execTcCache.splice(0);
        }
        else{
            return;
        }
        db.collection('executions', function(err, collection) {
            collection.findOne({_id:removed[0].executionID}, {}, function(err, execution) {
                if(execution != null) {
                    removed[0].indexedTC.executiontag = execution.tag;
                    indexES(common.Config.ELKServer,common.Config.ELKServerPort,removed[0].indexedTC,"testcaseresults/testcaseresult/"+removed[0]._id.toString(),operation,function(resp){
                        indexIt();
                        //console.log(resp);
                    })
                }
            })
        });
    };

    execTcCache.push({indexedTC:indexedTC,operation:operation,_id:testcaseResult._id,executionID:testcaseResult.executionID});
    if(execTcCache.length == 1){
        indexIt();
    }
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
        if (callback) callback({error:"Unable to connect to machine: "+host + " error: " + e.message});
    });

    // write data to request body
    req.write(JSON.stringify(command));
    req.end();
}
