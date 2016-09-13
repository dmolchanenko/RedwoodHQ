var common = require('../common');
var app = require('../common');
var db;
var ObjectID = require('mongodb').ObjectID;
var http = require("http");

common.initLogger("ELK");
common.parseConfig(function(){
    db = app.getDB();
    if(db !== null){
        console.log("get db reference");
    }
});

/*exports.publishToElkPost =  function(req, resp) {
    console.log("publishToElkPost: request");
    var executionId = req.body.executionID;
    publishDataToElk(executionId, function(){
        console.log("publishToElkPost: success");
        res.contentType('json');
        res.json({success:true});
    });
}*/

exports.publishDataToElk = function(execId, callback) {
    _publishExecutionDataToElk(execId, function() {
        _publishTestcasesToElk(execId, function() {
            _publishTestcaseResultsToElk(execId, function(){
                callback();
            });
        });
    });
}

/* Publish 'executions' record to ELK */
function _publishExecutionDataToElk(execId, callback) {
    console.log("_publishExecutionDataToElk");
    if(!execId) {
        console.log("elk: execId is null or undefined!");
        callback();
        return;
    }
    db = app.getDB();
    db.collection('executions', function(err, collection) {
        collection.findOne({_id:execId}, {}, function(err, execution) {
            //console.log("publish execution details to ELK " + JSON.stringify(execution));
            console.log("publish execution details to ELK ");

            if(!err){ // success
                var outresult = execution;
                outresult.id = execution._id;
                //outresult._timestamp = epoch_millis();
                delete outresult._id;
                delete outresult.variables;
                delete outresult.templates;
                var index = 0;
                for(var machine in outresult.machines){
                    outresult.machines[index].id = machine._id;
                    delete outresult.machines[index]._id;
                    delete outresult.machines.machineVars;
                    delete outresult.machines.roles;
                    index++;
                }
                console.log("OUTRESULT:  " + JSON.stringify(outresult));
                var executionsPath = common.Config.ElasticDataIndexPath + 'executions/';
                _executionResultsToElk(JSON.stringify(outresult), executionsPath, function(){
                        callback();
                });
            }
        });
    });
}

function _publishTestcasesToElk(execId, callback){
    console.log("_publishTestcasesToElk");
    if(!execId) {
        console.log("elk: execId is null or undefined!");
        callback();
        return;
    }
    db = app.getDB();
    db.collection('executiontestcases', function(err, collection) {
        collection.find({executionID:execId}, {}, function(err, cursor) {
            cursor.each(function(err, executiontestcase) {
                if(!executiontestcase) {
                    console.log("testcase : NULL");
                    callback();
                    return;
                }
                //console.log(executiontestcase);
                if(!err){ // success
                    var outresult = executiontestcase;
                    outresult.id = executiontestcase._id;
                    //outresult._timestamp = epoch_millis();
                    delete outresult._id;
                    console.log("OUTRESULT:  " + JSON.stringify(outresult));
                    var executionsPath = common.Config.ElasticDataIndexPath + 'executiontestcases/';
                    _executionResultsToElk(JSON.stringify(outresult), executionsPath, function(){
                        // donot end ... loop through and publish data
                        console.log("pushed one executiontestcase data to ELK");
                    });
                }
            });
        });
    });
}

function _publishTestcaseResultsToElk(execId, callback){
    console.log("_publishTestcaseResultsToElk");
    if(!execId) {
        console.log("elk: execId is null or undefined!");
        callback();
        return;
    }
    db = app.getDB();
    db.collection('testcaseresults', function(err, collection) {
        collection.find({executionID:execId}, {}, function(err, cursor) {
            cursor.each(function(err, testcaseresult) {
                if(!testcaseresult) {
                    console.log("testcaseresult : NULL");
                    callback();
                    return;
                }
                //console.log(testcaseresult);
                if(!err){ // success
                    var outresult = testcaseresult;
                    outresult.id = testcaseresult._id;
                    delete outresult._id;
                    delete outresult.children;
                    delete outresult.error;
                    delete outresult.trace;

                    console.log("OUTRESULT:  " + JSON.stringify(outresult));
                    var executionsPath = common.Config.ElasticDataIndexPath + 'testcaseresults/';
                    _executionResultsToElk(JSON.stringify(outresult), executionsPath, function(){
                        // donot end ... loop through and publish data
                        console.log("pushed one testcaseresult data to ELK");
                    });
                }
            });
        });
    });
}

function _executionResultsToElk(data, elkIndexPath, callback){
    console.log("_publishResultsToELK");
    console.log("try publishing execution results to ELK");
    var options = {
        hostname: common.Config.ElasticServerIPHost,
        port: common.Config.ElasticSearchPort,
        path: elkIndexPath,
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            console.log("Data PUBLISHED to ELK");
            callback();
        });
    });

    req.on('error', function(e) {
        console.log('Failed to publish data to ELK: ' + e.message);
        callback();
    });
    req.write(data);
    req.end();
}
