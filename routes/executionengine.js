var executiontestcases = require('../routes/executiontestcases');
var http = require("http");
var testcases = require('../routes/testcases');
var executions = {};
var common = require('../common');
var util = require('util');
var path = require('path');
var fs = require('fs');
var walk = require('walk');
var compile = require("./compile");
var realtime = require("../routes/realtime");
var db;

exports.startexecutionPost = function(req, res){
    db = common.getDB();
    if (req.body.testcases.length == 0){
        res.contentType('json');
        res.json({error:"No Test Cases are selected for execution."});
        return;
    }
    var executionID =  req.body.executionID;
    var machines = req.body.machines;
    var variables = {};
    var testcases = req.body.testcases;

    req.body.variables.forEach(function(variable){
        variables[variable.name] = variable.value;
    });

    /*
    db.collection('variables', function(err, collection) {
        collection.find({taskVar:false}, {}, function(err, cursor) {
            cursor.each(function(err, variable) {
                if(variable == null) {
                    //callback(variables);
                }
                else{
                    variables[variable.name] = variable.value;
                    console.log("HAHAHA")
                }
            });
        })
    });
    */

    console.log(variables);
    executions[executionID] = {testcases:{},machines:machines,variables:variables,currentTestCases:{},project:req.cookies.project};
    testcases.forEach(function(testcase){
        executions[executionID].testcases[testcase.testcaseID] = testcase;
    });
    lockMachines(machines);
    //random id for compile proc
    var id;
    for (var i = 0; i < 24; i++) {
        id += Math.floor(Math.random() * 10).toString(16);
    }
    var compileOut = "";
    compile.operation({project:req.cookies.project},id,function(data){compileOut = compileOut + data},function(){
        if (compileOut.indexOf("BUILD SUCCESSFUL") == -1){
            res.contentType('json');
            res.json({error:"Error, unable to compile scripts."});
        }
        else{
            res.contentType('json');
            res.json({success:true});
            executeTestCases(executions[executionID].testcases,executionID);
        }
    });
};

function executeTestCases(testcases,executionID){
    var variables = executions[executionID].variables;
    var machines = executions[executionID].machines;
    var tcArray = [];

    for(var key in testcases){
        tcArray.push(key);
    }

    //execution all done
    if (tcArray.length == 0){
        unlockMachines(machines);
        delete executions[executionID];
        return;
    }
    var count = 0;
    var nextTC = function(){

        startTCExecution(testcases[tcArray[count]].testcaseID,variables,executionID,function(){
            //console.log("test case started: "+testcases[tcArray[count]].testcaseID);
            count++;
            var machineAvailable = false;
            machines.forEach(function(machine){
                if(machine.runningTC == undefined){
                    machineAvailable = true;
                }
            });
            if((count < tcArray.length)&&(machineAvailable == true)){
                nextTC();
            }
            else{
                //remove any useless machines
                var toRemove = [];
                machines.forEach(function(machine){
                    if(machine.runningTC == undefined){
                        toRemove.push(machine)
                    }
                });
                unlockMachines(toRemove,function(){
                    toRemove.forEach(function(machine){
                        machines.splice(machines.indexOf(machine),1);
                    });
                });
            }
        });
    };
    nextTC();
}

function startTCExecution(id,variables,executionID,callback){
    GetTestCaseDetails(id,function(testcase,result,hosts){

        //updateExecutionTestCase({_id:testcases[0]._id.executionTestCaseID},{$set:{"status":"Running"}});
        updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":""}});
        var machines = executions[executionID].machines;

        machines.sort(function(a,b){
            return a.roles.length - b.roles.length;
        });

        hosts.push("Default");
        var reservedHosts = [];
        testcase.machines = [];
        machines.forEach(function(machine){
            hosts.forEach(function(host){
               if((machine.roles.indexOf(host) != -1)&& (reservedHosts.indexOf(host) == -1) &&((machine.runningTC == undefined)||(machine.runningTC == testcase))){
                   machine.runningTC = testcase;
                   reservedHosts.push(host);
                   testcase.machines.push(machine);
               }
           });
        });

        if (testcase.machines.length == 0){
            if (callback){
                callback({error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()});
            }
            updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Finished",result:"Failed",error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()}});
            return;
        }

        var agentInstructions = {command:"run action",executionID:executionID,testcaseID:testcase.dbTestCase._id};

        result.executionID = executionID;
        //result.testcaseName = testcase.dbTestCase.name;
        executions[executionID].currentTestCases[testcase.dbTestCase._id] = {testcase:testcase,result:result,executionTestCaseID:id};
        createResult(result,function(writtenResult){
            result._id = writtenResult[0]._id;
        });

        findNextAction(testcase.actions,variables,function(action){
            executions[executionID].currentTestCases[testcase.dbTestCase._id].currentAction = action;

            agentInstructions.name = action.name;
            agentInstructions.script = action.script;
            agentInstructions.parameters = [];
            action.dbAction.parameters.forEach(function(parameter){
                agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
                console.log(parameter);
            });

            var foundMachine = null;
            var actionHost = "Default";
            if(action.dbAction.host != "") actionHost = action.dbAction.host;
            testcase.machines.forEach(function(machine){
                if ((machine.roles.indexOf(actionHost) != -1)&&(foundMachine == null)){
                    foundMachine = machine;
                }
            });

            if (foundMachine.baseStateRun == true){
                if (callback) callback();
                sendAgentCommand(foundMachine.host,agentInstructions);
            }
            else{
                agentBaseState(executions[executionID].project,foundMachine.host,function(){
                    foundMachine.baseStateRun = true;
                    if (callback) callback();
                    sendAgentCommand(foundMachine.host,agentInstructions);
                });
            }
        });
    })
}


exports.actionresultPost = function(req, res){
    res.contentType('json');
    res.json({success:true});

    var execution = executions[req.body.executionID];
    var testcase = execution.currentTestCases[req.body.testcaseID];
    if (testcase == undefined) return;

    testcase.currentAction.result.status = "Finished";
    testcase.currentAction.result.result = req.body.result;
    testcase.result.result = req.body.result;
    if (req.body.error){
        testcase.currentAction.result.error = req.body.error;
        testcase.result.error = req.body.error;
    }
    else{
        testcase.result.error = "";
    }

    if (req.body.trace){
        testcase.currentAction.result.trace = req.body.trace;
        testcase.result.trace = req.body.trace;
    }


    if ((req.body.returnValue)&&(testcase.currentAction.dbAction.returnvalue != "")){
        execution.variables[testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
    }

    markFinishedResults(testcase.result.children,function(){
        updateResult(testcase.result);
    });

    var actionFlow = testcase.currentAction.dbAction.executionflow;
    if (req.body.result == "Failed"){
        if (actionFlow == "Record Error Stop Test Case"){
            finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
            //updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{"status":"Finished",result:"Failed"}});
            return;
        }
        else if (actionFlow == "Record Error Continue Test Case"){
            updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{result:"Failed"}});
        }
        else{
            testcase.currentAction.result.result = "Passed";
            testcase.result.result = "Passed";
            testcase.result.error = "";
        }
    }

    findNextAction(testcase.testcase.actions,execution.variables,function(action){
        if(action == null){
            finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
            return;
        }
        var agentInstructions = {command:"run action",executionID:req.body.executionID,testcaseID:testcase.testcase.dbTestCase._id};

        execution.currentTestCases[testcase.testcase.dbTestCase._id].currentAction = action;

        agentInstructions.name = action.name;
        agentInstructions.script = action.script;
        agentInstructions.parameters = [];
        action.dbAction.parameters.forEach(function(parameter){
            agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
            console.log(parameter);
        });
        sendAgentCommand("localhost",agentInstructions)
    });
};


//last action or we are done with the TC
//start next test case if there is one
function finishTestCaseExecution(execution,executionID,testcaseId,testcase){
    //updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{"status":"Finished",result:testcase.result.result}});
    updateExecutionTestCase({_id:testcaseId},{$set:{"status":"Finished",result:testcase.result.result,error:testcase.result.error}});
    var count = 0;
    testcase.testcase.machines.forEach(function(machine){
        delete machine.runningTC;
        count++;
        if (count == testcase.testcase.machines.length){
            delete execution.testcases[testcase.executionTestCaseID];
            delete execution.currentTestCases[testcase.executionTestCaseID];
            executeTestCases(execution.testcases,executionID);
        }
    });
}

function markFinishedResults(results,callback){
    var count = 0;
    var status = "Passed";
    results.forEach(function(action){
        if (action.status == "Not Run"){
            if (action.children.length != 0){
                markFinishedResults(action.children,function(childStatus){
                    count++;
                    if(count == results.length){
                        if (childStatus == "Not Run"){
                            callback("Not Run");
                        }
                        else{
                            action.status = status;
                            callback(status)
                        }
                    }
                })
            }
            else{
                status = "Not Run"
            }
        }
        else if((action.status == "Failed")&&(status != "Not Run")){
            status = "Failed"
        }
        count++;
        if (count == results.length){
            callback(status);
        }
    });
}


function agentBaseState(project,agentHost,callback){
    sendAgentCommand(agentHost,{command:"cleanup"},function(){
        syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/bin"),"bin",function(){
            syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/External Libraries"),"lib",function(){
                syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/build/jar"),"lib",function(){
                    syncFilesWithAgent(agentHost,path.join(__dirname, '../launcher'),"launcher",function(){
                        sendAgentCommand(agentHost,{command:"start launcher"},function(){
                            callback();
                        });
                    });
                })
            })
        });
    });
}

function syncFilesWithAgent(agentHost,rootPath,destDir,callback){
    var walker = walk.walkSync(rootPath);

    var fileCount = 0;
    walker.on("file", function (root, fileStats, next) {
        fileCount++;
        var path = root.replace(rootPath,"");
        var dest = "";
        if (path == ""){
            dest = destDir +"/"+ fileStats.name;
        }
        else{
            dest = destDir + path+"/"+fileStats.name
        }

        sendFileToAgent(root+"/"+fileStats.name,dest,agentHost,function(){
            fileCount--;
            if(fileCount == 0){
                callback();
            }
        });
        console.log(path+"/"+fileStats.name);
        //sendFileToAgent()
    });

    walker.on("end",function(){
        if (fileCount == 0) callback();
    });
}

function sendFileToAgent(file,dest,agentHost,callback){
    var stat = fs.statSync(file);

    var readStream = fs.createReadStream(file);
    var boundary = '--------------------------';
    for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
    }

    var message =  '------' + boundary + '\r\n'
        // use your file's mime type here, if known
        + 'Content-Disposition: form-data; name="file"; filename="'+dest+'"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
        // "name" is the name of the form field
        // "filename" is the name of the original file
        + 'Content-Transfer-Encoding: binary\r\n\r\n';



    var options = {
        hostname: agentHost,
        port: 3001,
        path: '/fileupload',
        method: 'POST',
        headers: {
            //'Content-Type': 'text/plain'//,
            'Content-Type': 'multipart/form-data; boundary=----'+boundary,
            //'Content-Disposition': 'form-data; name="file"; filename="ProjectName.jar"',
            //'Content-Length': 3360
            //'Content-Length': stat.size + message.length + 30 + boundary.length
            'Content-Length': stat.size + message.length + boundary.length + 14
        }
    };

    var req = http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        //res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    req.write(message);
    readStream.pipe(req, { end: false });
    readStream.on("end", function(){
        req.end('\r\n------' + boundary + '--\r\n');
    });
}

function sendAgentCommand(agentHost,command,callback){
    var options = {
        hostname: agentHost,
        port: 3001,
        path: '/command',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(command));
    req.end();
}


function resolveParamValue(value,variables){
    var returnNULL = false;
    if (value.length > 4){
        if ((value.indexOf("$\{") == 0) &&(value.charAt(value.length -1) == "}") && (value.split("}").length > 1))
        {
            returnNULL = true;
        }
    }
    var result = value.replace(new RegExp( "\\$\\{([\\w_.-]+)\\}", "g" ),function(a,b){
        if(b in variables){
            if (variables[b] == "<NULL>"){
                if (returnNULL == true){
                    return "<NULL>"
                }
                else{
                    return "";
                }
            }
            else{
                return variables[b];
            }
        }
        else{
            return a;
        }
    });
    return result;
}

function createResult(result,callback){
    db.collection('testcaseresults', function(err, collection) {
        result._id = db.bson_serializer.ObjectID(result._id);
        collection.insert(result, {safe:true},function(err,returnData){
            callback(returnData);
        });

    });
}

function updateResult(result,callback){
    db.collection('testcaseresults', function(err, collection) {
        collection.save(result,{safe:true},function(err){
            if (callback){
                callback(err);
            }
        });
    });
}

function updateExecutionTestCase(query,update,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            realtime.emitMessage("UpdateExecutionTestCase",data);
            if (callback){
                callback(err);
            }
        });
    });
}

function lockMachines(machines,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findAndModify({_id:machine._id},{},{$set:{state:"Running Test"}},{safe:true,new:true},function(err,data){
                realtime.emitMessage("UpdateMachines",data);
                machineCount++;
                if (machineCount == machines.length){
                    if (callback) callback();
                }
            });
        });
    });
}

function unlockMachines(machines,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findAndModify({_id:machine._id},{},{$set:{state:""}},{safe:true,new:true},function(err,data){
                realtime.emitMessage("UpdateMachines",data);
                machineCount++;
                if (machineCount == machines.length){
                    if (callback) callback();
                }
            });
        });
    });
}


function findNextAction (actions,variables,callback){
    var order = 0;
    var allDone = false;
    actions.sort(function(a, b){
        return parseInt(a.dbAction.order)-parseInt(b.dbAction.order);
    });

    actions.forEach(function(action){
        order++;
        //if(action.dbAction.order == order.toString()){
            if (action.result.status == "Finished"){
                if (order == actions.length){
                    if (allDone == false){
                        callback(null);
                        allDone = true;
                    }
                    return;
                }
                return;
            }
            if (action.script){
                var paramVars = {};
                if ((action.parent.dbAction)&&(action.parent.dbAction.parameters)){
                    action.parent.dbAction.parameters.forEach(function(param){
                        paramVars[param.paramname] = param.paramvalue;
                    });
                }
                for (var attrname in variables) { paramVars[attrname] = variables[attrname]; }
                action.dbAction.parameters.forEach(function(param){
                    param.paramvalue = resolveParamValue(param.paramvalue,paramVars);
                });
                if (allDone == false){
                    callback(action);
                    allDone = true;
                }
            }
            else{
                findNextAction(action.actions,variables,function(action){
                    if ((action == null) &&(order == actions.length)){
                        if (allDone == false){
                            callback(null);
                            allDone = true;
                        }
                    }
                    else if (action != null){
                        var paramVars = {};
                        if (action.parent.dbAction.parameters){
                            action.parent.dbAction.parameters.forEach(function(param){
                                paramVars[param.paramname] = param.paramvalue;
                            });
                        }
                        for (var attrname in variables) { paramVars[attrname] = variables[attrname]; }
                        action.dbAction.parameters.forEach(function(param){
                            param.paramvalue = resolveParamValue(param.paramvalue,paramVars);
                        });
                        if (allDone == false){
                            callback(action);
                            allDone = true;
                        }
                    }
                });
            }
        //}

    });
}


function GetTestCaseDetails(testcaseID,callback){
    var testcaseDetails = {};
    var testcaseResults = {};
    var hosts = [];

    var getActionDetails = function(nextAction,lastPoint,lastResultPoint,cb){
        db.collection('actions', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(nextAction.actionid)}, {}, function(err, action) {
                lastPoint.name = action.name;
                lastResultPoint.name = action.name;
                if (action.type == "script")
                {
                    lastPoint.script = action.script;
                    lastResultPoint.script = action.script;
                    lastResultPoint.leaf = true;
                    cb();
                }
                else
                {
                    if (action.collection.length > 0){
                        var pending = action.collection.length;
                        action.collection.forEach(function(innerAction){
                            if ((innerAction.host != "")&&(hosts.indexOf(innerAction.host) == -1)){
                                hosts.push(innerAction.host)
                            }
                            var newActionResult = {parameters:innerAction.parameters,status:"Not Run",children:[]};
                            lastResultPoint.children.push(newActionResult);
                            var newAction = {result:newActionResult,dbAction:innerAction,parent:lastPoint,actions:[],returnValues:{}};
                            lastPoint.actions.push(newAction);
                            getActionDetails(innerAction,newAction,newActionResult,function(){
                                if (!--pending) cb();
                            });
                        });
                    }
                }
            });
        });
    };

    db.collection('testcases', function(err, collection) {
        collection.findOne({_id:db.bson_serializer.ObjectID(testcaseID)}, {}, function(err, testcase) {
            if (testcase.type == "script"){
                testcaseDetails = {dbTestCase:testcase,script:testcase.script};
                testcaseResults = {testcaseName:testcase.name,testcaseID:testcase._id,script:testcase.script,leaf:true};
                callback({script:testcase.script});
            }
            else{
                if (testcase.collection.length > 0){
                    testcaseDetails = {dbTestCase:testcase,actions:[]};
                    testcaseResults = {name:testcase.name,testcaseID:testcase._id,children:[]};
                    var pending = testcase.collection.length;
                    testcase.collection.forEach(function(innerAction){
                        if ((innerAction.host != "")&&(hosts.indexOf(innerAction.host) == -1)){
                            hosts.push(innerAction.host)
                        }
                        var newActionResult = {parameters:innerAction.parameters,status:"Not Run",children:[]};
                        testcaseResults.children.push(newActionResult);
                        var newAction = {dbAction:innerAction,parent:testcaseDetails,result:newActionResult,actions:[]};
                        testcaseDetails.actions.push(newAction);
                        getActionDetails(innerAction,newAction,newActionResult,function(){
                            if (!--pending) callback(testcaseDetails,testcaseResults,hosts);
                        });
                    });
                }
                else{
                    callback(null);
                }
            }
        })
    })

}

