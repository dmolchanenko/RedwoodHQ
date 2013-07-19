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

exports.stopexecutionPost = function(req, res){
    var execution = executions[req.body.executionID];
    if(!execution) return;
    unlockMachines(execution.machines);
    for(var testcase in execution.currentTestCases){
        updateExecutionTestCase({_id:execution.testcases[testcase]._id},{$set:{status:"Not Run","result":"",error:"",trace:"",startdate:"",enddate:"",runtime:""}});
    }

    updateExecution({_id:req.body.executionID},{$set:{status:"Ready To Run"}},function(){
        res.contentType('json');
        res.json({success:true});
        delete executions[req.body.executionID];
    });
};


exports.startexecutionPost = function(req, res){
    db = common.getDB();

    if (req.body.testcases.length == 0){
        res.contentType('json');
        res.json({error:"No Test Cases are selected for execution."});
        return;
    }
    var executionID =  req.body.executionID;
    var ignoreStatus =  req.body.ignoreStatus;
    var machines = req.body.machines;
    var variables = {};
    var testcases = req.body.testcases;

    req.body.variables.forEach(function(variable){
        variables[variable.name] = variable.value;
    });

    var sourceCache = [];
    cacheSourceCode(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/src"),sourceCache);

    executions[executionID] = {ignoreStatus:ignoreStatus,testcases:{},machines:machines,variables:variables,currentTestCases:{},project:req.cookies.project,username:req.cookies.username,sourceCache:sourceCache.reverse()};
    //random id for compile proc
    var id;
    for (var i = 0; i < 24; i++) {
        id += Math.floor(Math.random() * 10).toString(16);
    }
    var compileOut = "";
    compile.operation({project:req.cookies.project,username:req.cookies.username},id,function(data){compileOut = compileOut + data},function(){
        if (compileOut.indexOf("BUILD SUCCESSFUL") == -1){
            res.contentType('json');
            res.json({error:"Error, unable to compile scripts."});
        }
        else{
            res.contentType('json');
            res.json({success:true});
            updateExecution({_id:executionID},{$set:{status:"Running"}});

            lockMachines(machines,executionID,function(){
                getGlobalVars(executionID,function(){
                    testcases.forEach(function(testcase){
                        executions[executionID].testcases[testcase.testcaseID] = testcase;
                    });
                    //see if there is a base state
                    suiteBaseState(executionID,machines,function(){
                        executeTestCases(executions[executionID].testcases,executionID);
                    });
                });
            });
        }
    });


};

function suiteBaseState(executionID,machines,callback){
    var count = 0;
    var foundSuiteState = false;
    var suiteBaseTCs = [];

    var lastMachine = function(){
        if (count === machines.length){
            if (suiteBaseTCs.length > 0){
                executions[executionID].cachedTCs = executions[executionID].testcases;
                executions[executionID].testcases = {};
                suiteBaseTCs.forEach(function(tc){
                    executions[executionID].testcases[tc.testcaseID] = tc;
                });
                executions[executionID].baseStateFailed = false;
            }
            callback()
        }
    };

    machines.forEach(function(machine){
        if(machine.baseState){
            foundSuiteState = true;
            machine.roles.push(machine.host);
            db.collection('testcases', function(err, collection) {
                collection.insert({name:machine.host+"_state",status:"Automated",collection:[{order:"1",actionid:machine.baseState,host:machine.host,executionflow:"Record Error Stop Test Case",parameters:[]}]}, {safe:true},function(err,testcaseData){
                    db.collection('executiontestcases', function(err, collection) {
                        //collection.save({_id:machine.resultID},{},{$set:{executionID:executionID,name:machine.host+"_state",status:"Not Run",testcaseID:testcaseData[0]._id.__id,_id: machine.resultID}}, {safe:true,new:true},function(err,returnData){
                        collection.save({baseState:true,executionID:executionID,name:machine.host+"_state",status:"Not Run",testcaseID:testcaseData[0]._id.__id,_id: machine.baseStateTCID},function(err,returnData){
                            suiteBaseTCs.push({testcaseID:testcaseData[0]._id.__id,retryCount:0,_id:machine.baseStateTCID,status:"Not Run",name:machine.host+"_state"});
                            count++;
                            lastMachine();
                        });
                    });
                });
            });
        }
        else{
            count++;
        }
        lastMachine();
    });
}


function cacheSourceCode(rootPath,cacheArray){
    var walker = walk.walk(rootPath);

    var fileCount = 0;
    walker.on("file", function (root, fileStats, next) {
        if ((fileStats.name.indexOf(".groovy") != -1) || (fileStats.name.indexOf(".java")!= -1)){
            var stream = fs.ReadStream(root+"/"+fileStats.name);
            stream.setEncoding('utf8');
            var cache = "";
            stream.on('data', function(data) {
                cache += data;
                if (cache.indexOf("package ") != -1){
                    var packageIndex = cache.indexOf("package ")+8;
                    var packageName = "";
                    if (fileStats.name.indexOf(".java") != -1){
                        packageName = cache.substring(packageIndex,cache.indexOf(";",packageIndex));
                    }
                    else{
                        packageName = cache.substring(packageIndex,cache.indexOf("\n",packageIndex));
                    }
                    packageName = packageName.replace(";","");
                    packageName = packageName.replace("\r","");
                    packageName = packageName.trim();
                    cacheArray.push({name:fileStats.name,dir:root.replace(rootPath,""),packageName:packageName});
                    stream.destroy();
                    next();
                }
            });
            stream.on("end", function(){
                cacheArray.push({name:fileStats.name,dir:root.replace(rootPath,""),packageName:""});
                next();
            })
        }
        else{
            fileCount++;
        }
    });
}


function getGlobalVars(executionID,callback){
    db.collection('variables', function(err, collection) {
        collection.find({taskVar:false}, {}, function(err, cursor) {
            cursor.each(function(err, variable) {
                if(variable == null) {
                    callback();
                }
                else{
                    executions[executionID].variables[variable.name] = variable.value;
                }
            });
        })
    });
}

function executeTestCases(testcases,executionID){
    var variables = executions[executionID].variables;
    var machines = executions[executionID].machines;
    var tcArray = [];

    for(var key in testcases){
        tcArray.push(key);
    }

    //execution all done
    if (tcArray.length == 0){
        if (executions[executionID].cachedTCs){
            if(executions[executionID].baseStateFailed === true){
                unlockMachines(machines);
                updateExecution({_id:executionID},{$set:{status:"Ready To Run"}});
                delete executions[executionID];
                return;
            }
            executions[executionID].testcases = executions[executionID].cachedTCs;
            delete executions[executionID].cachedTCs;
            for(key in executions[executionID].testcases){
                tcArray.push(key);
            }
            testcases = executions[executionID].testcases;
        }
        else{
            unlockMachines(machines);
            updateExecution({_id:executionID},{$set:{status:"Ready To Run"}});
            delete executions[executionID];
            return;
        }
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
    if (count == 0) nextTC();
}

function startTCExecution(id,variables,executionID,callback){
    GetTestCaseDetails(id,executionID,function(testcase,result,hosts){
        createResult(result,function(writtenResult){
            result._id = writtenResult[0]._id;
            result.executionID = executionID;
            executions[executionID].currentTestCases[testcase.dbTestCase._id] = {testcase:testcase,result:result,executionTestCaseID:id};
            testcase.machines = [];

            testcase.startDate = new Date();

            if (((testcase.dbTestCase.status != "Automated")||(testcase.statusError)) && (executions[executionID].ignoreStatus == false)){
                var error = "";
                if (testcase.statusError){
                    error = testcase.statusError
                }else{
                    error = "Test Case is not Automated"
                }

                //if (callback){
                //    callback({error:error});
                //}
                result.error = error;
                result.status = "Finished";
                //result.result = testcase.dbTestCase.status;
                result.result = error;
                updateResult(result);
                //executions[executionID].testcases[id].result = result;
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                return;
            }

            //if there is nothing to execute just finish the TC
            if (((testcase.dbTestCase.type === "collection")&&(testcase.actions.length == 0)) || ((testcase.dbTestCase.type === "script")&&(testcase.dbTestCase.script == ""))){
                //if (callback){
                //    callback();
                //}
                result.status = "Finished";
                result.result = "Passed";
                updateResult(result);
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                return;
            }

            //updateExecutionTestCase({_id:testcases[0]._id.executionTestCaseID},{$set:{"status":"Running"}});
            var machines = executions[executionID].machines;

            machines.sort(function(a,b){
                return a.roles.length - b.roles.length;
            });

            //hosts.push("Default");
            var reservedHosts = [];
            testcase.machines = [];
            console.log(machines);
            console.log(hosts);
            machines.forEach(function(machine,index){
                hosts.forEach(function(host){
                   if((machine.roles.indexOf(host) != -1)&& (reservedHosts.indexOf(host) == -1) &&((machine.runningTC == undefined)||(machine.runningTC == testcase))){
                       machine.runningTC = testcase;
                       reservedHosts.push(host);
                       testcase.machines.push(machine);
                   }
               });
            });


            if (testcase.machines.length == 0){
                //if (callback){
                //    callback({error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()});
                //}
                //updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Finished",result:"Failed",resultID:result._id,error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()}});
                result.error = "Unable to find matching machine for this test case.  Roles required are:"+hosts.join();
                result.status = "Finished";
                result.result = "Failed";
                updateResult(result);
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                return;
            }

            var count = 0;
            var errorFound = false;


            machines.forEach(function(machine){
                if (machine.runBaseState === true){
                    return;
                }
                agentBaseState(executions[executionID].project+"/"+executions[executionID].username,machine.host,machine.port,function(err){
                    if (errorFound == true){
                        return;
                    }
                    count++;
                    if (err){
                        //if (callback){
                        //    callback({error:err});
                        //}
                        result.error = err;
                        result.status = "Finished";
                        result.result = "Failed";
                        updateResult(result);
                        if (executions[executionID]){
                            finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                        }
                        return;
                    }
                    else{
                        //returnMachines.push(machine);
                        machines.runBaseState = true;
                    }
                    if (count === machines.length){

                        var agentInstructions = {command:"run action",executionID:executionID,testcaseID:testcase.dbTestCase._id};

                        //if test case is a script and NOT an action collection
                        if (testcase.dbTestCase.type === "script"){
                            //executions[executionID].currentTestCases[testcase.dbTestCase._id].currentAction = action;
                            if ((testcase.script == "") || (!testcase.script)){
                                //if (callback){
                                //    callback({error:"Test Case does not have a script assigned"});
                                //}
                                result.error = "Test Case does not have a script assigned";
                                result.status = "Finished";
                                result.result = "Failed";
                                updateResult(result);
                                //executions[executionID].testcases[id].result = result;
                                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                                return;
                            }
                            agentInstructions.name = testcase.name;
                            agentInstructions.script = testcase.script;
                            agentInstructions.resultID = result._id.__id;
                            agentInstructions.parameters = [];

                            var foundMachine = null;
                            var actionHost = "Default";
                            //if(action.dbAction.host != "") actionHost = action.dbAction.host;
                            testcase.machines.forEach(function(machine){
                                if ((machine.roles.indexOf(actionHost) != -1)&&(foundMachine == null)){
                                    foundMachine = machine;
                                }
                            });

                            updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":"",error:"",trace:"",resultID:result._id,startdate:testcase.startDate,enddate:"",runtime:"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
                            sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                            return;
                        }

                        callback();
                        findNextAction(testcase.actions,variables,function(action){
                            if (!executions[executionID]) return;
                            if(action == null){
                                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                                return;
                            }

                            executions[executionID].currentTestCases[testcase.dbTestCase._id].currentAction = action;

                            agentInstructions.name = action.name;
                            agentInstructions.script = action.script;
                            agentInstructions.resultID = result._id.__id;
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

                            updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":"",error:"",trace:"",resultID:result._id,startdate:testcase.startDate,enddate:"",runtime:"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
                            sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                            /*
                            if (foundMachine.baseStateRun == true){
                                if (callback) callback();
                                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                            }
                            else{
                                agentBaseState(executions[executionID].project,foundMachine.host,foundMachine.port,function(err){
                                    if (err){

                                    }
                                    foundMachine.baseStateRun = true;
                                    if (callback) callback();
                                    sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                                });
                            }
                            */
                        });
                    }
                });
            });

        })
    });
}

exports.logPost = function(req,res){
    var record = req.body;
    delete record.command;

    db.collection('executionlogs', function(err, collection) {
        collection.insert(record, {safe:true},function(err,returnData){
            res.contentType('json');
            res.json({success:true});
        });
    });
};


exports.actionresultPost = function(req, res){
    res.contentType('json');
    res.json({success:true});

    var execution = executions[req.body.executionID];
    if (!execution) return;
    var testcase = execution.currentTestCases[req.body.testcaseID];
    if (testcase == undefined) return;

    if (testcase.testcase.script){
        testcase.result.status = "Finished";
        testcase.result.result = req.body.result;
        if (req.body.error){
            testcase.result.error = req.body.error;
        }
        else{
            testcase.result.error = "";
        }

        if (req.body.trace){
            formatTrace(req.body.trace,execution.sourceCache,function(trace){
                testcase.result.trace = trace;
                updateResult(testcase.result);
            });
        }
        else{
            updateResult(testcase.result);
        }
        finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
        return;
    }

    testcase.currentAction.result.status = "Finished";
    testcase.result.status = "Finished";
    testcase.currentAction.result.result = req.body.result;
    if (testcase.result.result != "Failed"){
        testcase.result.result = req.body.result;
    }
    if (req.body.error){
        testcase.result.error = req.body.error;
        testcase.currentAction.result.error = req.body.error;
    }
    else{
        testcase.result.error = "";
    }

    if (req.body.trace){
        testcase.result.trace = req.body.trace;
        testcase.currentAction.result.trace = req.body.trace;
    }


    if ((req.body.returnValue)&&(testcase.currentAction.dbAction.returnvalue != "")){
        execution.variables[testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
    }

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
            testcase.currentAction.result.trace = "";
            testcase.currentAction.result.error = "";
            testcase.result.result = "Passed";
            testcase.result.error = "";
        }
    }

    markFinishedResults(testcase.result.children,execution.sourceCache,function(){
        updateResult(testcase.result);
    });

    findNextAction(testcase.testcase.actions,execution.variables,function(action){
        if(action == null){
            finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
            return;
        }

        var foundMachine = null;
        var actionHost = "Default";
        if(action.dbAction.host != "") actionHost = action.dbAction.host;
        testcase.testcase.machines.forEach(function(machine){
            if ((machine.roles.indexOf(actionHost) != -1)&&(foundMachine == null)){
                foundMachine = machine;
            }
        });

        updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{"status":"Running","result":"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
        testcase.result.status = "Running";

        var agentInstructions = {command:"run action",executionID:req.body.executionID,testcaseID:testcase.testcase.dbTestCase._id};

        execution.currentTestCases[testcase.testcase.dbTestCase._id].currentAction = action;

        agentInstructions.name = action.name;
        agentInstructions.script = action.script;
        agentInstructions.resultID = testcase.result._id.__id;
        agentInstructions.parameters = [];
        action.dbAction.parameters.forEach(function(parameter){
            agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
            console.log(parameter);
        });
        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions)
    });
};


//last action or we are done with the TC
//start next test case if there is one
function finishTestCaseExecution(execution,executionID,testcaseId,testcase){
    //updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{"status":"Finished",result:testcase.result.result}});
    var date = new Date();
    var updateExecution = function(){updateExecutionTestCase({_id:testcaseId},{$set:{"status":"Finished",resultID:testcase.result._id.__id,result:testcase.result.result,error:testcase.result.error,enddate:date,runtime:date-testcase.testcase.startDate,host:"",vncport:""}});}
    //update machine base state result
    if(execution.cachedTCs){
        if (testcase.testcase.machines.length > 0){
            updateExecutionMachine(executionID,testcase.testcase.machines[0]._id,testcase.result.result,testcase.result._id.__id,function(){
                updateExecution();
            });
        }
        else{
            updateExecution();
        }
        //updateExecutionMachine({testcase.testcase.machines[0]._id)},{$set:{result:testcase.result.result,resultID:testcase.result._id.__id}});
    }
    else{
        updateExecution();
    }
    var count = 0;
    var retry = false;
    if(testcase.result.result == "Failed"){
        if (execution.testcases[testcase.executionTestCaseID].retryCount > 0){
            retry = true;
            execution.testcases[testcase.executionTestCaseID].retryCount--;
        }
        if (execution.cachedTCs){
            execution.baseStateFailed = true;
        }
    }
    if(testcase.testcase.machines.length === 0){
        if (retry == false){
            delete execution.testcases[testcase.executionTestCaseID];
        }
        delete execution.currentTestCases[testcase.executionTestCaseID];
        executeTestCases(execution.testcases,executionID);
        return;
    }
    testcase.testcase.machines.forEach(function(machine){
        delete machine.runningTC;
        count++;
        if (count == testcase.testcase.machines.length){
            if (retry == false){
                delete execution.testcases[testcase.executionTestCaseID];
            }
            delete execution.currentTestCases[testcase.executionTestCaseID];
            executeTestCases(execution.testcases,executionID);
        }
    });
}

function formatTrace(trace,sourceCache,callback){
    var newTrace = "";
    var traceCount = 0;
    var traces = trace.split(",");
    traces.forEach(function(line){
        traceCount++;
        var fileName = line.substring(line.indexOf("(")+1,line.indexOf(":"));
        var lineNumber = line.substring(line.indexOf(":")+1,line.indexOf(")"));
        var location =  line.substring(0,line.indexOf("("));
        location = location.trim();
        location = location.replace("[","");
        var count = 0;
        var found = false;
        sourceCache.forEach(function(file){
            if (found == true) return;
            if ((file.name === fileName)&&(location.indexOf(file.packageName) == 0)){
                found = true;
                lineNumber = (parseInt(lineNumber,10)-1).toString();
                newTrace += ",\r\n<a style= 'color: blue;' href='javascript:openScript(&quot;/src"+ file.dir+"/"+file.name +"&quot;,&quot;"+ lineNumber +"&quot;)'>" + line +"</a>";
            }
            count++;
            if (count == sourceCache.length){
                if (found == false){
                    if (line.indexOf("[") == 0){
                        newTrace += line;
                    }
                    else{
                        newTrace += ",\r\n"+line;
                    }
                }
                if (traceCount == traces.length){
                    callback(newTrace);
                }
            }
        });
    });
}

function markFinishedResults(results,sourceCache,callback){
    var count = 0;
    var result = "Passed";
    var status = "Finished";
    results.forEach(function(action){
        if (action.status == "Not Run"){
            if (action.children.length != 0){
                markFinishedResults(action.children,sourceCache,function(childStatus,childResult,markFinished){
                    action.expanded = false;
                    if (markFinished === true){
                        action.status = "Finished";
                        action.result = "Failed";
                        action.expanded = true;
                        callback("Finished","Failed",true);
                        return;
                    }
                    count++;
                    if (childStatus == "Not Run"){
                        status = "Not Run";
                        result = "";
                    }
                    if((childStatus == "Finished") && (childResult == "Failed")){
                        result = "Failed";
                        action.expanded = true;
                    }
                    if(count == action.children.length){
                        action.result = result;
                        action.status = status;
                        if (status == "Finished"){
                            if ((action.executionflow == "Record Error Stop Test Case")&&(result == "Failed")){
                                callback(status,result,true)
                            }
                            else{
                                callback(status,result)
                            }
                        }
                        else{
                            callback(status,"")
                        }
                    }
                })
            }
            else{
                callback("Not Run","")
            }
        }
        else{
            var returnValue;
            if ((action.executionflow == "Record Error Stop Test Case")&&(action.result == "Failed")){
                returnValue = function(){callback("Finished","Failed",true)}
            }
            else{
                returnValue = function(){callback("Finished",action.result)}
            }

            if(action.result == "Failed"){
                action.expanded = true;
            }
            if(action.trace){
                formatTrace(action.trace,sourceCache,function(trace){
                    action.trace = trace;
                    returnValue();
                })
            }
            else{
                returnValue();
            }
        }
    });
}


function agentBaseState(project,agentHost,port,callback){
    sendAgentCommand(agentHost,port,{command:"cleanup"},function(err){
        if (err){
            callback(err);
            return;
        }
        syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/bin"),"bin",function(){
            syncFilesWithAgent(agentHost,port,path.join(__dirname, '../launcher'),"launcher",function(){
                syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/External Libraries"),"lib",function(){
                    syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/build/jar"),"lib",function(){
                        syncFilesWithAgent(agentHost,port,path.join(__dirname, '../launcher'),"launcher",function(){
                            sendAgentCommand(agentHost,port,{command:"start launcher"},function(err){
                                if (err){
                                    callback(err);
                                }
                                else{
                                    callback();
                                }
                            });
                        });
                    })
                })
            })
        });
    });
}

function syncFilesWithAgent_old(agentHost,port,rootPath,destDir,callback){
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

        sendFileToAgent(root+"/"+fileStats.name,dest,agentHost,port,function(){
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

function syncFilesWithAgent(agentHost,port,rootPath,destDir,callback){
    var walker = walk.walkSync(rootPath);
    var fileCount = 0;
    var files = [];

    var sendFiles = function(){
        fileCount++;
        if (!files[fileCount-1]){
            callback();
            return;
        }
        sendFileToAgent(files[fileCount-1].file,files[fileCount-1].dest,agentHost,port,function(){

            if(fileCount === files.length){
                callback();
            }
            else{
                sendFiles()
            }
        });
    };

    walker.on("file", function (root, fileStats, next) {
        var path = root.replace(rootPath,"");
        var dest = "";
        if (path == ""){
            dest = destDir +"/"+ fileStats.name;
        }
        else{
            dest = destDir + path+"/"+fileStats.name
        }

        files.push({file:root+"/"+fileStats.name,dest:dest});
        console.log(path+"/"+fileStats.name);
    });

    walker.on("end",function(){
        sendFiles()
    });
}

function sendFileToAgent(file,dest,agentHost,port,callback){
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
        port: port,
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
        //res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message+ ' file:'+file);
    });

    req.write(message);
    readStream.pipe(req, { end: false });
    readStream.on("end", function(){
        req.end('\r\n------' + boundary + '--\r\n');
    });
}

function sendAgentCommand(agentHost,port,command,callback){
    var options = {
        hostname: agentHost,
        port: port,
        path: '/command',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var msg = JSON.parse(chunk);
            console.log('BODY: ' + chunk);
            if(msg.error != null){
                if (callback) callback(msg.error);
            }
            else{
                if(callback) callback();
            }
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        if (callback) callback("Unable to connect to machine: "+agentHost + " error: " + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(command));
    req.end();
}


function resolveParamValue(value,variables){
    var returnNULL = false;
    if (typeof value != "string"){
        return value;
    }

    if (value.length > 4){
        if ((value.indexOf("$\{") == 0) &&(value.charAt(value.length -1) == "}") && (value.split("}").length > 1))
        {
            returnNULL = true;
        }
    }
    //var result = value.replace(new RegExp("\\$\\{([\\w_.-\\s*]+)\\}", "g" ),function(a,b){
    var result = value.replace(new RegExp("\\$\\{([\\s\\w_.-]+)\\}", "g" ),function(a,b){
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
            realtime.emitMessage("UpdateResult",result);
        });
    });
}

function updateExecutionTestCase(query,update,machineHost,vncport,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            if (data == null){
                if (callback){
                    callback(err);
                }
                return;
            }
            if (machineHost){
                data.host = machineHost;
                data.vncport = vncport;
            }
            realtime.emitMessage("UpdateExecutionTestCase",data);
            if (callback){
                callback(err);
            }
        });
    });
}

function updateExecution(query,update,callback){
    db.collection('executions', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            realtime.emitMessage("UpdateExecutions",data);
            if (callback){
                callback(err);
            }
        });
    });
}

function updateExecutionMachine(executionID,machineID,result,resultID,callback){
    db.collection('executions', function(err, collection) {
        collection.update({_id:executionID,machines:{$elemMatch:{_id:machineID}}},{$set:{'machines.$.result':result,'machines.$.resultID':resultID}},{safe:true,new:true},function(err,data){
            //realtime.emitMessage("UpdateExecutions",data);
            if (callback){
                callback(err);
            }
        });
    });
}

function updateMachine(query,update,callback){
    db.collection('machines', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            if(data != null){
                realtime.emitMessage("UpdateMachines",data);
            }
            if (callback) callback();
        });
    });
}


function lockMachines(machines,executionID,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        updateExecutionMachine(executionID,machine._id,"","");
        updateMachine({_id:db.bson_serializer.ObjectID(machine._id)},{$set:{state:"Running Test"}},function(){
            machineCount++;
            if (machineCount == machines.length){
                //if(executions[executionID].cachedTCs){
                //}
                if(callback) callback();
            }
        })
    });
}

function unlockMachines(machines,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        updateMachine({_id:db.bson_serializer.ObjectID(machine._id)},{$set:{state:""}},function(){
            machineCount++;
            if (machineCount == machines.length){
                if(callback) callback();
            }
        })
    });
}


function findNextAction (actions,variables,callback){
    var order = 0;
    var allDone = false;
    actions.sort(function(a, b){
        return parseInt(a.dbAction.order)-parseInt(b.dbAction.order);
    });

    var resolveParams = function(action,callback){
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
        callback();
    };

    actions.forEach(function(action){
        order++;
        if (action.runAction == false){
            //callback(null);
            //allDone = true;
            //action.result.status = "Finished";
            if (order == actions.length){
                if (allDone == false){
                    callback(null);
                    allDone = true;
                }
                return;
            }
            return;
        }
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
        if ((action.script)||((action.actions.length == 0) && ((!action.script)))){
            resolveParams(action,function(){
                if (allDone == false){
                    callback(action);
                    allDone = true;
                }
            });
        }
        else{
            resolveParams(action,function(){
                findNextAction(action.actions,variables,function(action){
                    if ((action == null) &&(order == actions.length)){
                        if (allDone == false){
                            callback(null);
                            allDone = true;
                        }
                    }
                    else if (action != null){
                        resolveParams(action,function(){
                            if (allDone == false){
                                callback(action);
                                allDone = true;
                            }
                        });
                    }
                });
            })
        }

    });
}


function GetTestCaseDetails(testcaseID,executionID,callback){
    var testcaseDetails = {};
    var testcaseResults = {};
    var hosts = [];

    var getActionDetails = function(nextAction,lastPoint,lastResultPoint,cb){
        db.collection('actions', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(nextAction.actionid)}, {}, function(err, action) {
                lastPoint.name = action.name;
                lastResultPoint.name = action.name;
                lastResultPoint.actionStatus = action.status;
                if (action.status != "Automated"){
                    testcaseDetails.statusError = "One ore more actions inside the test case are not in automated state.";
                    lastResultPoint.error = "Action " + action.status;
                }
                lastResultPoint.expanded = false;
                if (action.type == "script")
                {
                    lastPoint.script = action.script;
                    lastPoint.type = action.type;
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
                            if(lastPoint.dbAction.executionflow == "Ignore Error Continue Test Case"){innerAction.executionflow = "Ignore Error Continue Test Case"}
                            var newActionResult = {order:innerAction.order,actionid:innerAction.actionid,parameters:innerAction.parameters,status:"Not Run",expanded:false,children:[],executionflow:innerAction.executionflow};
                            lastResultPoint.children.push(newActionResult);
                            var newAction = {result:newActionResult,dbAction:innerAction,parent:lastPoint,actions:[],returnValues:{}};
                            lastPoint.actions.push(newAction);
                            getActionDetails(innerAction,newAction,newActionResult,function(){
                                if (!--pending) cb();
                            });
                        });
                    }
                    else{
                        cb();
                    }
                }
            });
        });
    };

    db.collection('testcases', function(err, collection) {
        collection.findOne({_id:db.bson_serializer.ObjectID(testcaseID)}, {}, function(err, testcase) {
            if (testcase.type == "script"){
                testcaseDetails = {dbTestCase:testcase,script:testcase.script};
                testcaseResults = {name:testcase.name,testcaseID:testcase._id,script:testcase.script,leaf:true};
                callback(testcaseDetails,testcaseResults,[]);
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
                        var newActionResult = {order:innerAction.order,actionid:innerAction.actionid,parameters:innerAction.parameters,status:"Not Run",expanded:false,children:[],executionflow:innerAction.executionflow};
                        testcaseResults.children.push(newActionResult);

                        var runAction = true;

                        //if start action is greater than all actions don't execute anything
                        if (executions[executionID].testcases[testcaseID].startAction > testcase.collection.length){
                            runAction = false;
                        }
                        else if ((executions[executionID].testcases[testcaseID].startAction)&&(executions[executionID].testcases[testcaseID].startAction != "")){
                            var endAction = 99999;
                            if ((executions[executionID].testcases[testcaseID].endAction)&&(executions[executionID].testcases[testcaseID].endAction != "")){
                                endAction = parseInt(executions[executionID].testcases[testcaseID].endAction)
                            }
                            if (parseInt(executions[executionID].testcases[testcaseID].startAction) <= endAction){
                                if ((parseInt(executions[executionID].testcases[testcaseID].startAction) <= parseInt(innerAction.order)) && (endAction >= parseInt(innerAction.order))){

                                }
                                else{
                                    runAction = false;
                                }
                            }
                        }

                        var newAction = {dbAction:innerAction,parent:testcaseDetails,result:newActionResult,actions:[],runAction:runAction};
                        testcaseDetails.actions.push(newAction);
                        getActionDetails(innerAction,newAction,newActionResult,function(){
                            if (!--pending) callback(testcaseDetails,testcaseResults,hosts);
                        });
                    });
                }
                else{
                    callback({dbTestCase:testcase,actions:[]},{name:testcase.name,testcaseID:testcase._id,children:[]},[]);
                }
            }
        })
    })

}

