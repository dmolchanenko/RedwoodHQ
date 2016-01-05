var argv = require('optimist')
    .usage('Usage: $0 --name [name] --user [username] --testset [testset name] --machines [hostname1:threads:baseState,hostname2:threads:baseState] --cloudTemplate [templateName:instances:threads] --pullLatest [true] --retryCount [1] --variables [name=value,name2=value2] --tags [tag1,tag2] --project [projectname] --ignoreScreenshots [true,false]')
    .demand(['name','testset','project','user'])
    .argv;
var common = require('../common');
var app = require('../common');
var xml = require('xml-writer');
var fs = require('fs');
var db;
var ObjectID = require('mongodb').ObjectID;
var http = require("http");

common.initLogger("cli");
common.parseConfig(function(){
    var execution = {};
    execution.project = argv.project;
    execution.user = argv.user;
    execution.name = argv.name;
    execution.status = "Ready To Run";
    execution.locked = true;
    execution.ignoreStatus = false;
    execution.lastRunDate = null;
    execution.testsetname = argv.testset;
    execution.pullLatest = argv.pullLatest;
    if(argv.tags){
        execution.tag = argv.tags.split(",");
    }
    if(argv.retryCount){
        execution.retryCount = argv.retryCount;
    }
    else{
        execution.retryCount = "0";
    }
    if(argv.ignoreScreenshots){
        if(argv.ignoreScreenshots === "true"){
            execution.ignoreScreenshots = true;
        }
        else{
            execution.ignoreScreenshots = false;
        }
    }
    else{
        execution.ignoreScreenshots = false;
    }
    execution._id = new ObjectID().toString();

    common.initDB(common.Config.DBPort,function(){
        db = app.getDB();
        PullLatest(execution,function(){
            formatMachines(function(machines){
                execution.machines = machines;
                execution.templates = [];
                if(argv.cloudTemplate){
                    execution.templates.push({name:argv.cloudTemplate.split(":")[0],result:"",description:"",instances:parseInt(argv.cloudTemplate.split(":")[1]),threads:parseInt(argv.cloudTemplate.split(":")[2])})
                }
                formatTestSet(argv.testset,argv.project,function(testsetID){
                    execution.testset = testsetID.toString();
                    saveExecutionTestCases(testsetID,execution._id,function(testcases){
                        if(argv.variables){
                            formatVariables(argv.variables.split(","),argv.project,function(variables){
                                execution.variables = variables;
                                SaveAndRunExecution(execution,testcases,function(){

                                })
                            })
                        }
                        else{
                            execution.variables = [];
                            SaveAndRunExecution(execution,testcases,function(){

                            })
                        }
                    });
                });
            });
        });
    });
});

function saveExecutionTestCases(testsetID,executionID,callback){
    var testcases = [];
    db.collection('testsets', function(err, testSetCollection) {
        db.collection('executiontestcases', function(err, ExeTCCollection) {
            //console.log(testsetID);
            testSetCollection.findOne({_id:db.bson_serializer.ObjectID(testsetID.toString())}, {testcases:1}, function(err, dbtestcases) {
                dbtestcases.testcases.forEach(function(testcase,index){
                    db.collection('testcases', function(err, tcCollection) {
                        tcCollection.findOne({_id:db.bson_serializer.ObjectID(testcase._id.toString())},{name:1},function(err,dbtestcase){
                            var insertTC = {executionID:executionID,name:dbtestcase.name,tag:testcase.tag,status:"Not Run",testcaseID:testcase._id.toString(),_id: new ObjectID().toString()};
                            testcases.push(insertTC);
                            ExeTCCollection.insert(insertTC, {safe:true},function(err,returnData){
                                if(index+1 == dbtestcases.testcases.length){
                                    callback(testcases);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

function PullLatest(execution,callback){
    if(execution.pullLatest !== "true"){
        callback();
        return
    }
    var options = {
        hostname: "localhost",
        port: common.Config.AppServerPort,
        path: '/scripts/pull',
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': 'username='+execution.user+";project="+execution.project
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify({}));
    req.end();
}

function StartExecution(execution,testcases,callback){
    var options = {
        hostname: "localhost",
        port: common.Config.AppServerPort,
        path: '/executionengine/startexecution',
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': 'username='+execution.user+";project="+execution.project
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            var msg = JSON.parse(chunk);
            if(msg.error){
                console.log("Unable to continue with execution: "+msg.error);
                process.exit(1);
            }
            callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify({retryCount:execution.retryCount,ignoreStatus:execution.ignoreStatus,ignoreScreenshots:execution.ignoreScreenshots,testcases:testcases,variables:execution.variables,executionID:execution._id,machines:execution.machines,templates:execution.templates}));
    req.end();
}

function SaveExecution(execution,callback){
    var options = {
        hostname: "localhost",
        port: common.Config.AppServerPort,
        path: '/executions/'+execution._id,
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': 'username='+execution.user+";project="+execution.project
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(execution));
    req.end();
}

function MonitorExecution(execution,callback){
    var getStatus = function(callback){
        db.collection('executions', function(err, collection) {
            collection.findOne({_id:execution._id}, {status:1}, function(err, dbexecution) {
                callback(dbexecution.status);
            });
        });
    };

    var verifyStatus = function(status){
        if(status == "Ready To Run"){
            setTimeout(function(){callback()},10000);
        }else{
            setTimeout(function(){getStatus(verifyStatus)},10000)
        }
    };

    setTimeout(function(){getStatus(verifyStatus)},20000)

}

function GenerateReport_old(cliexecution,callback){
    var xw = new xml();
    xw.startDocument();
    xw.startElement('testng-results');

    db.collection('executions', function(err, collection) {
        collection.findOne({_id:cliexecution._id}, {}, function(err, execution) {
            xw.writeAttribute('skipped', execution.notRun.toString());
            xw.writeAttribute('failed', execution.failed.toString());
            xw.writeAttribute('passed', execution.passed.toString());
            xw.writeAttribute('total', execution.total.toString());
            xw.startElement('suite');
            xw.writeAttribute('name',execution.name);
            xw.writeAttribute('duration-ms',execution.runtime.toString());
            xw.writeAttribute('started-at',execution.lastRunDate.toString());
            xw.writeAttribute('finished-at','0');
            xw.startElement('groups');
            xw.endElement();
            xw.startElement('test');
            xw.writeAttribute('name',execution.name);
            xw.writeAttribute('duration-ms',execution.runtime.toString());
            xw.writeAttribute('started-at',execution.lastRunDate.toString());
            xw.writeAttribute('finished-at','0');
            xw.startElement('class');
            xw.writeAttribute('name',execution.name);

            db.collection('executiontestcases', function(err, collection) {
                collection.find({executionID:execution._id}, {}, function(err, cursor) {
                    cursor.each(function(err, testcase) {
                        if(testcase == null) {
                            xw.endElement();
                            xw.endElement();
                            xw.endElement();
                            xw.endElement();
                            xw.endDocument();
                            //console.log(xw.toString());
                            fs.writeFile("result.xml",xw.toString(),function(){
                                callback(0);
                            });
                            return;
                        }
                        //console.log(testcase);
                        xw.startElement('test-method');
                        xw.writeAttribute('name',testcase.name);
                        xw.writeAttribute('signature',testcase.name);
                        xw.writeAttribute('duration',testcase.runtime.toString());
                        xw.writeAttribute('started-at',testcase.startdate.toString());
                        xw.writeAttribute('finished-at',testcase.enddate.toString());
                        if (testcase.result == "Passed"){
                            xw.writeAttribute('status',"PASS");
                            xw.endElement();
                        }
                        else if (testcase.result == "Failed"){
                            xw.writeAttribute('status',"FAIL");
                            xw.startElement('exception');
                            xw.startElement('message');
                            xw.writeCData(testcase.error);
                            xw.endElement();
                            xw.startElement('full-stacktrace');
                            xw.writeCData(testcase.trace);
                            xw.endElement();
                            xw.endElement();
                            xw.endElement();
                        }
                        else{
                            xw.writeAttribute('status',"SKIPPED");
                            xw.endElement();
                        }

                    });
                })
            });
        });
    });
}

function GenerateReport(cliexecution,callback){
    var xw = new xml();
    xw.startDocument();
    xw.startElement('testsuite');

    db.collection('executions', function(err, collection) {
        collection.findOne({_id:cliexecution._id}, {}, function(err, execution) {
            console.log(execution);
            xw.writeAttribute('errors', "0");
            xw.writeAttribute('failures', execution.failed.toString());
            xw.writeAttribute('tests', execution.total.toString());
            xw.writeAttribute('name',execution.name);
            xw.writeAttribute('time',execution.runtime.toString());
            xw.writeAttribute('timestamp',execution.lastRunDate.toString());
            xw.startElement('properties');
            xw.endElement();

            db.collection('executiontestcases', function(err, collection) {
                var failed = false;
                collection.find({executionID:execution._id}, {}, function(err, cursor) {
                    cursor.each(function(err, testcase) {
                        if(testcase == null) {
                            xw.endElement();
                            xw.endDocument();
                            //console.log(xw.toString());
                            fs.writeFile("result.xml",xw.toString(),function(){
                                if(failed == false){
                                    callback(0);
                                }
                                else{
                                    callback(1);
                                }
                            });
                            return;
                        }
                        //console.log(testcase);
                        xw.startElement('testcase');
                        xw.writeAttribute('classname',testcase.name);
                        xw.writeAttribute('name',testcase.name);
                        xw.writeAttribute('time',(testcase.runtime / 1000).toString());
                        if (testcase.result == "Passed"){
                            xw.endElement();
                        }
                        else if (testcase.result == "Failed"){
                            failed = true;
                            xw.startElement('failure');
                            xw.writeAttribute('type',"Test Case Error");
                            xw.writeAttribute('message',testcase.error);

                             if(argv.resultURL){
                                 //xw.writeAttribute('name',"<a href='"+argv.resultURL+"/index.html?result="+testcase.resultID+"&project="+argv.project+"'>"+testcase.name+"</a>");
                                 xw.writeCData(argv.resultURL+"/index.html?result="+testcase.resultID+"&project="+argv.project+"   "+testcase.trace);
                             }
                             else{
                                xw.writeCData(testcase.trace);
                             }

                            xw.endElement();
                            xw.endElement();
                        }
                        else{
                            xw.writeAttribute('executed',"false");
                            xw.endElement();
                        }

                    });
                })
            });
        });
    });
}

function SaveAndRunExecution(execution,testcases,callback){
    SaveExecution(execution,function(){
        StartExecution(execution,testcases,function(){
            MonitorExecution(execution,function(){
                GenerateReport(execution,function(exitCode){
                    process.exit(exitCode);
                })
            });
        })
    })
}

function formatTestSet(testset,project,callback){
    db.collection('testsets', function(err, collection) {
        collection.findOne({name:testset,project:project}, {_id:1}, function(err, dbtestset) {
            callback(dbtestset._id);
        });
    });
}

function formatVariables(clivariables,project,callback){
    var variables = [];
    var count = 0;
    db.collection('variables', function(err, collection) {
        clivariables.forEach(function(variable){
            collection.findOne({name:variable.split("=")[0].trim(),project:project}, {}, function(err, dbvariable) {
                dbvariable.value = variable.split("=")[1];
                variables.push(dbvariable);
                count++;
                if(count == clivariables.length){
                    callback(variables);
                }
            });
        });
    });
}

function formatMachines(callback){
    if(!argv.machines) callback([]);
    var machines = argv.machines.split(",");
    var result = [];
    var count = 0;
    db.collection('machines', function(err, collection) {
        machines.forEach(function(machine){
            collection.findOne({host:machine.split(":")[0]}, {}, function(err, dbmachine) {
                if(!dbmachine){
                    console.log("Machine: " +machine.split(":")[0]+" not found.");
                    process.exit(1)
                }
                dbmachine.threads = machine.split(":")[1];
                count++;
                if(machine.split(":").length == 3){
                    db.collection('actions', function(err, actionCollection) {
                        actionCollection.findOne({name:machine.split(":")[2]}, {}, function(err, action) {
                            if(action){
                                dbmachine.baseState = action._id;
                                result.push(dbmachine);
                                if(count == machines.length){
                                    callback(result);
                                }
                            }
                            else{
                                console.log("Suite Base state: " +machine.split(":")[2]+" not found.");
                                process.exit(1)
                            }
                        });
                    });
                }
                else{
                    result.push(dbmachine);
                    if(count == machines.length){
                        callback(result);
                    }
                }
            });
        });
    });
}

