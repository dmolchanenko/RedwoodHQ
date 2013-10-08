var executiontestcases = require('../routes/executiontestcases');
var http = require("http");
var testcases = require('../routes/testcases');
var executionsRoute = require('../routes/executions');
var executions = {};
var common = require('../common');
var util = require('util');
var path = require('path');
var fs = require('fs');
var walk = require('walk');
var compile = require("./compile");
var realtime = require("../routes/realtime");
var git = require('../gitinterface/gitcommands');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var nodemailer = require("nodemailer");
var db;

exports.stopexecutionPost = function(req, res){
    var execution = executions[req.body.executionID];
    if(!execution) return;
    cleanUpMachines(execution.machines,req.body.executionID);
    unlockMachines(execution.machines);
    for(var testcase in execution.currentTestCases){
        updateExecutionTestCase({_id:execution.testcases[testcase]._id},{$set:{status:"Not Run","result":"",error:"",trace:"",startdate:"",enddate:"",runtime:""}});
    }

    updateExecution({_id:req.body.executionID},{$set:{status:"Ready To Run"}},function(){
        executionsRoute.updateExecutionTotals(req.body.executionID);
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
    var ignoreScreenshots =  req.body.ignoreScreenshots;
    var ignoreAfterState =  req.body.ignoreAfterState;
    var sendEmail =  req.body.sendEmail;
    var machines = req.body.machines;
    var variables = {};
    var testcases = req.body.testcases;

    req.body.variables.forEach(function(variable){
        variables[variable.name] = variable.value;
    });

    var machineConflict = false;
    machines.forEach(function(machine){
        if (machine.state == "Running Test"){
            machineConflict = true;
        }

    });

    if(machineConflict == true){
        res.contentType('json');
        res.json({error:"Selected machines are currently running other tests."});
        return;
    }

    if(executions[executionID]){
        res.contentType('json');
        res.json({error:"Execution is already running."});
        return;
    }

    executions[executionID] = {sendEmail:sendEmail,ignoreAfterState:ignoreAfterState,ignoreStatus:ignoreStatus,ignoreScreenshots:ignoreScreenshots,testcases:{},machines:machines,variables:variables,currentTestCases:{},project:req.cookies.project,username:req.cookies.username};


    compileBuild(req.cookies.project,req.cookies.username,function(err){
        if (err != null){
            res.contentType('json');
            res.json({error:"Unable to compile scripts."});
            delete executions[executionID];
        }
        else{
            cacheSourceCode(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username),function(sourceCache){
                executions[executionID].sourceCache = sourceCache;
                updateExecution({_id:executionID},{$set:{status:"Running",lastRunDate:new Date()}});
                verifyMachineState(machines,function(err){
                    if(err){
                        updateExecution({_id:executionID},{$set:{status:"Ready To Run"}});
                        res.contentType('json');
                        res.json({error:err});
                        delete executions[executionID];
                        return;
                    }
                    res.contentType('json');
                    res.json({success:true});
                    lockMachines(machines,executionID,function(){

                        getGlobalVars(executionID,function(){
                            testcases.forEach(function(testcase){
                                executions[executionID].testcases[testcase.testcaseID] = testcase;
                            });
                            //see if there is a base state
                            suiteBaseState(executionID,machines,function(){
                                //magic happens here
                                applyMultiThreading(executionID,function(){
                                    updateExecution({_id:executionID},{$set:{status:"Running",lastRunDate:new Date()}},function(){
                                        executeTestCases(executions[executionID].testcases,executionID);
                                    });
                                })
                            });
                        });
                    });
                });
            });
        }
    });
};

function compileBuild(project,username,callback){
    var workDir = rootDir+project+"/"+username;

    var compileScripts = function(){
        var compileOut = "";
        //random id for compile proc
        var id;
        for (var i = 0; i < 24; i++) {
            id += Math.floor(Math.random() * 10).toString(16);
        }

        compile.operation({project:project,username:username},id,function(data){compileOut = compileOut + data},function(){
            if (compileOut.indexOf("BUILD SUCCESSFUL") == -1){
                callback("unable to compile")
            }
            else{
                callback(null)
            }

        })
    };

    fs.exists(workDir+"/build", function (exists) {
        if(exists == true){
            fs.stat(workDir+"/build",function(err,stats){
                if(err) {
                    compileScripts();
                }
                else{
                    git.commitsSinceDate(workDir,stats.mtime,function(data){
                        if (data == "0\n"){
                            callback(null)
                        }
                        else{
                            compileScripts();
                        }
                    });
                }
            });
        }
        else{
            compileScripts()
        }
    });
}


function applyMultiThreading(executionID,callback){
    var count = 0;
    var mainMachinesCount = executions[executionID].machines.length;
    executions[executionID].machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(machine._id)}, {}, function(err, dbMachine) {
                var startThread = dbMachine.takenThreads - machine.threads;
                console.log("staring at:"+startThread);
                machine.threadID = startThread;
                //if more than one thread run base state if not let it go
                if (machine.threads > 1){
                    machine.multiThreaded = true;
                    agentBaseState(executions[executionID].project+"/"+executions[executionID].username,executionID,machine.host,machine.port,machine.threadID,function(err){
                        machine.runBaseState = true;

                        var newMachineCount = 1;
                        for(var i=machine.threads;i>1;i--){
                            var newMachine = {};
                            for (var key in machine) {
                                newMachine[key] = machine[key];
                            }
                            newMachine.threadID = i+startThread-1;
                            console.log(newMachine);
                            executions[executionID].machines.push(newMachine);
                            sendAgentCommand(newMachine.host,newMachine.port,{command:"start launcher",executionID:executionID,threadID:newMachine.threadID},function(err){
                                newMachineCount++;
                                if (newMachineCount == machine.threads){
                                    count++;
                                    if(count == mainMachinesCount){
                                        callback();
                                    }
                                }
                            });

                        }

                    });
                }
                else{
                    count++;
                    if(count == mainMachinesCount){
                        callback();
                    }
                }
            });
        });
    });

}


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
                collection.insert({baseState:true,name:machine.host+"_state",status:"Automated",collection:[{order:"1",actionid:machine.baseState,host:machine.host,executionflow:"Record Error Stop Test Case",parameters:[]}]}, {safe:true},function(err,testcaseData){
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


function cacheSourceCode(rootPath,callback){
    git.lsFiles(rootPath,["*.groovy","*.java"],function(data){
        var files = [];
        if ((data != "")&&(data.indexOf("\n") != -1)){
            files = data.split("\n",data.match(/\n/g).length);
        }
        callback(files);
    })
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


function cleanUpMachines(machines,executionID,callback){
    var count = 0;
    machines.forEach(function(machine){
        sendAgentCommand(machine.host,machine.port,{command:"cleanup",executionID:executionID},function(err){
            count++;
            if(count == machines.length){
                if(callback) callback();
            }
        });
    })
}

function executeTestCases(testcases,executionID){
    if (!executions[executionID]) return;
    executions[executionID].executingTCs = true;
    var variables = executions[executionID].variables;
    var machines = executions[executionID].machines;
    var tcArray = [];

    for(var key in testcases){
        tcArray.push(key);
    }

    //execution all done
    //if (tcArray.length == 0){
    var finishExecution = function(callback){
        if (executions[executionID].cachedTCs){
            if(executions[executionID].baseStateFailed === true){
                unlockMachines(machines,function(){
                    cleanUpMachines(executions[executionID].machines,executionID,function(){

                    });
                    delete executions[executionID];
                    //return;
                    callback(true)
                });
                updateExecution({_id:executionID},{$set:{status:"Ready To Run"}});
                executionsRoute.updateExecutionTotals(executionID,function(){
                    if(executions[executionID].sendEmail == true) sendNotification(executionID);
                });
                callback(true);
                return;
            }
            executions[executionID].machines.forEach(function(machine){
                machine.baseState = null;
            });
            executions[executionID].testcases = executions[executionID].cachedTCs;
            delete executions[executionID].cachedTCs;
            tcArray = [];
            for(key in executions[executionID].testcases){
                tcArray.push(key);
            }
            testcases = executions[executionID].testcases;
            callback(false)
        }
        else{
            unlockMachines(executions[executionID].machines,function(){
                cleanUpMachines(executions[executionID].machines,executionID,function(){

                });
                delete executions[executionID];
                callback(true)
            });
            updateExecution({_id:executionID},{$set:{status:"Ready To Run"}},function(){
                if(executions[executionID].sendEmail == true) sendNotification(executionID);
            });
            //return;
        }
    };

    var count = 0;
    var doneCount = 0;
    var nextTC = function(){
        if (!testcases[tcArray[count]]){
            executions[executionID].executingTCs = false;
            return;
        }
        if (testcases[tcArray[count]].executing == true){
            count++;
            nextTC();
            return;
        }
        else if(testcases[tcArray[count]].finished == true){
            count++;
            doneCount++;
            if (doneCount == tcArray.length){
                finishExecution(function(finishIt){
                    if(finishIt == false){
                        count = 0;
                        nextTC();
                    }
                    else{
                        if(executions[executionID]) executions[executionID].executingTCs = false;
                    }
                });
                return;
            }
            nextTC();
            return;
        }
        testcases[tcArray[count]].executing = true;
        startTCExecution(testcases[tcArray[count]].testcaseID,variables,executionID,function(){
            if (!executions[executionID]) return;
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
                executions[executionID].executingTCs = false;
                //remove any useless machines
                var toRemove = [];

                machines.forEach(function(machine){
                    if(machine.runningTC == undefined){
                        //don't remove any machines if this is just a suite base state that is running
                        if(!executions[executionID].cachedTCs){
                            toRemove.push(machine)
                        }
                    }
                });
                unlockMachines(toRemove,function(){
                    toRemove.forEach(function(machine){
                        machines.splice(machines.indexOf(machine),1);
                    });
                });
                //if nothing else to execute finish it.
                var somethingToRun = false;

                tcArray.forEach(function(testcaseCount){
                    if(testcases[testcaseCount].finished != true){
                        somethingToRun = true;
                    }
                });
                if(somethingToRun == false){
                    finishExecution(function(finishIt){
                        if(finishIt == false){
                            count = 0;
                            nextTC();
                        }
                        else{
                            if(executions[executionID]) executions[executionID].executingTCs = false;
                        }
                    });
                }
            }
        });
    };
    if (count == 0) nextTC();
}

function startTCExecution(id,variables,executionID,callback){
    GetTestCaseDetails(id,executionID,function(testcase,result,hosts){
        if(testcase == null){
            callback();
            return;
        }
        testcase.machines = [];
        testcase.machineVars = [];
        var reservedHosts = [];
        var busyMachines = false;
        executions[executionID].machines.forEach(function(machine,index){
            if(machine.runningTC != undefined){
                busyMachines = true;
            }
            hosts.forEach(function(host){
                if((machine.roles.indexOf(host) != -1)&& (reservedHosts.indexOf(host) == -1) &&((machine.runningTC == undefined)||(machine.runningTC == testcase))){
                    machine.runningTC = testcase;
                    reservedHosts.push(host);
                    testcase.machines.push(machine);
                    machine.roles.forEach(function(role){
                        if (machine.machineVars){
                            machine.machineVars.forEach(function(variable){
                                testcase.machineVars["Machine."+role+"."+variable.name] = variable.value
                            });
                        }
                        testcase.machineVars["Machine."+role+".Host"] = machine.host;
                        testcase.machineVars["Machine."+role+".Port"] = machine.port;
                    })
                }
            });
        });
        if ((testcase.machines.length == 0) || (reservedHosts.length != hosts.length)){
            if(busyMachines == true){
                executions[executionID].testcases[id].executing = false;
                callback();
                return;
            }
        }
        createResult(result,function(writtenResult){
            result._id = writtenResult[0]._id;
            result.executionID = executionID;
            executions[executionID].currentTestCases[testcase.dbTestCase._id] = {testcase:testcase,result:result,executionTestCaseID:id};
            //testcase.machines = [];

            testcase.startDate = new Date();

            if (((testcase.dbTestCase.status != "Automated")||(testcase.statusError)) && (executions[executionID].ignoreStatus == false)){
                var error = "";
                if (testcase.statusError){
                    error = testcase.statusError
                }else if(testcase.dbTestCase.status == "To be Automated"){
                    error = "Test Case is not Automated"
                }else if(testcase.dbTestCase.status == "Needs Maintenance"){
                    error = "Test Case Needs Maintenance"
                }

                //if (callback){
                //    callback({error:error});
                //}
                result.error = testcase.dbTestCase.status;
                result.status = "Not Run";
                //result.result = testcase.dbTestCase.status;
                result.result = error;
                updateResult(result);
                //executions[executionID].testcases[id].result = result;
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                callback();
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
                callback();
                return;
            }

            //updateExecutionTestCase({_id:testcases[0]._id.executionTestCaseID},{$set:{"status":"Running"}});
            var machines = executions[executionID].machines;

            machines.sort(function(a,b){
                return a.roles.length - b.roles.length;
            });

            /*
            var reservedHosts = [];
            testcase.machines = [];
            testcase.machineVars = [];
            machines.forEach(function(machine,index){
                hosts.forEach(function(host){
                   if((machine.roles.indexOf(host) != -1)&& (reservedHosts.indexOf(host) == -1) &&((machine.runningTC == undefined)||(machine.runningTC == testcase))){
                       machine.runningTC = testcase;
                       reservedHosts.push(host);
                       testcase.machines.push(machine);
                       machine.roles.forEach(function(role){
                           if (machine.machineVars){
                               machine.machineVars.forEach(function(variable){
                                    testcase.machineVars["Machine."+role+"."+variable.name] = variable.value
                               });
                           }
                           testcase.machineVars["Machine."+role+".Host"] = machine.host;
                           testcase.machineVars["Machine."+role+".Port"] = machine.port;
                       })
                   }
               });
            });
            */


            if ((testcase.machines.length == 0) || (reservedHosts.length != hosts.length)){
                //if (callback){
                //    callback({error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()});
                //}
                //updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Finished",result:"Failed",resultID:result._id,error:"Unable to find matching machine for this test case.  Roles required are:"+hosts.join()}});
                result.error = "Unable to find matching machine for this test case.  Roles required are:"+hosts.join();
                result.status = "Finished";
                result.result = "Failed";
                updateResult(result);
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                callback();
                return;
            }

            var count = 0;
            var errorFound = false;

            //var startTC = function(){

            var agentInstructions = {command:"run action",executionID:executionID,testcaseID:testcase.dbTestCase._id};

            //if test case is a script and NOT an action collection
            if (testcase.dbTestCase.type === "script"){
                if ((testcase.script == "") || (!testcase.script)){
                    result.error = "Test Case does not have a script assigned";
                    result.status = "Finished";
                    result.result = "Failed";
                    updateResult(result);
                    //executions[executionID].testcases[id].result = result;
                    finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                    return;
                }
                agentInstructions.name = testcase.name;
                agentInstructions.ignoreScreenshots = executions[executionID].ignoreScreenshots;
                agentInstructions.executionID = executionID;
                agentInstructions.testcaseName = testcase.name;
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
                agentInstructions.threadID = foundMachine.threadID;

                updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":"",error:"",trace:"",resultID:result._id,startdate:testcase.startDate,enddate:"",runtime:"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
                executionsRoute.updateExecutionTotals(executionID);
                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                callback();
                return;
            }

            callback();
            for (var attrname in testcase.machineVars) { variables[attrname] = testcase.machineVars[attrname]; }
            variables["Framework.TestCaseName"] = testcase.dbTestCase.name;
            findNextAction(testcase.actions,variables,function(action){
                if (!executions[executionID]) return;
                if(!executions[executionID].currentTestCases[testcase.dbTestCase._id]) return;
                if(action == null){
                    finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                    return;
                }

                executions[executionID].currentTestCases[testcase.dbTestCase._id].currentAction = action;

                agentInstructions.name = action.name;
                agentInstructions.executionID = executionID;
                agentInstructions.ignoreScreenshots = executions[executionID].ignoreScreenshots;
                agentInstructions.returnValueName = action.dbAction.returnvalue;
                agentInstructions.testcaseName = testcase.dbTestCase.name;
                agentInstructions.script = action.script;
                agentInstructions.resultID = result._id.__id;
                agentInstructions.parameters = [];
                action.dbAction.parameters.forEach(function(parameter){
                    agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
                });

                var foundMachine = null;
                var actionHost = "Default";
                if(action.dbAction.host != "") actionHost = action.dbAction.host;
                testcase.machines.forEach(function(machine){
                    if ((machine.roles.indexOf(actionHost) != -1)&&(foundMachine == null)){
                        foundMachine = machine;
                    }
                });


                agentInstructions.threadID = foundMachine.threadID;
                updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":"",error:"",trace:"",resultID:result._id,startdate:testcase.startDate,enddate:"",runtime:"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
                if ((testcase.machines.length > 0) &&((testcase.machines[0].baseState))){
                    updateExecutionMachine(executionID,testcase.machines[0]._id,"",result._id.__id);
                }
                executionsRoute.updateExecutionTotals(executionID);


                var runBaseState = function(){
                    agentBaseState(executions[executionID].project+"/"+executions[executionID].username,executionID,foundMachine.host,foundMachine.port,foundMachine.threadID,function(err){

                        if (err){
                            result.error = err;
                            result.status = "Finished";
                            result.result = "Failed";
                            updateResult(result);
                            if (executions[executionID]){
                                executions[executionID].currentTestCases[testcase.dbTestCase._id].result = result;
                                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[testcase.dbTestCase._id]);
                            }
                        }
                        else{
                            foundMachine.runBaseState = true;
                            sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                        }
                    });
                };

                if (foundMachine.runBaseState === true){
                    if (foundMachine.multiThreaded  == true){
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                    }
                    else{
                        //make sure the files are actually there, in case of revert to snapshot or not persistent VMs files
                        //could have changed while test case was running
                        sendAgentCommand(foundMachine.host,foundMachine.port,{command:"files loaded",executionID:executionID},function(message){
                            if (message.loaded == true){
                                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                            }
                            else{
                                runBaseState();
                            }
                        });
                    }

                }
                else{
                    runBaseState();
                }
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
            realtime.emitMessage("AddExecutionLog",record);
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
    testcase.currentAction.result.result = req.body.result;
    if(!testcase.result.error){
        testcase.result.error = "";
    }
    if (req.body.error){
        testcase.result.error = req.body.error;
        testcase.currentAction.result.error = req.body.error;
    }

    if (req.body.trace){
        testcase.result.trace = req.body.trace;
        testcase.currentAction.result.trace = req.body.trace;
        testcase.trace = req.body.trace;
    }

    if (req.body.screenshot){
        testcase.result.screenshot = req.body.screenshot;
        testcase.currentAction.result.screenshot = req.body.screenshot;
    }



    if ((req.body.returnValue)&&(testcase.currentAction.dbAction.returnvalue != "")){
        execution.variables[testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
    }

    var actionFlow = testcase.currentAction.dbAction.executionflow;
    if (req.body.result == "Failed"){
        if (actionFlow == "Record Error Stop Test Case"){
            testcase.result.status = "Finished";
            testcase.result.result = "Failed";
            testcase.runAfterState = true;
            testcase.testcase.actions.forEach(function(action){
                if(!action.dbAction.afterState == true){
                    action.runAction = false;
                }
            });
            //updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{error:testcase.result.error,trace:testcase.trace}});
            /*
            markFinishedResults(testcase.result.children,execution.sourceCache,function(){
                updateResult(testcase.result);
            });
            finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
            return;
            */

        }
        else if (actionFlow == "Record Error Continue Test Case"){
            testcase.result.result = "Failed";
            updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{result:"Failed",trace:testcase.trace}});
        }
        else{
            testcase.currentAction.result.result = "";
            testcase.currentAction.result.trace = "";
            testcase.currentAction.result.error = "";
            testcase.result.result = "";
            testcase.result.error = "";
        }
    }

    markFinishedResults(testcase.result.children,execution.sourceCache,function(){
        updateResult(testcase.result);
    });

    var variables = execution.variables;
    for (var attrname in testcase.machineVars) { variables[attrname] = testcase.machineVars[attrname]; }
    findNextAction(testcase.testcase.actions,variables,function(action){
        if(action == null){
            testcase.result.status = "Finished";
            if(testcase.result.result != "Failed") testcase.result.result = "Passed";
            updateResult(testcase.result);
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

        var agentInstructions = {command:"run action",executionID:req.body.executionID,threadID:foundMachine.threadID,testcaseID:testcase.testcase.dbTestCase._id};

        execution.currentTestCases[testcase.testcase.dbTestCase._id].currentAction = action;

        agentInstructions.name = action.name;
        agentInstructions.executionID = req.body.executionID;
        agentInstructions.ignoreScreenshots = executions[req.body.executionID].ignoreScreenshots;
        agentInstructions.returnValueName = action.dbAction.returnvalue;
        agentInstructions.testcaseName = testcase.testcase.dbTestCase.name;
        agentInstructions.script = action.script;
        agentInstructions.resultID = testcase.result._id.__id;
        agentInstructions.parameters = [];
        action.dbAction.parameters.forEach(function(parameter){
            agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
        });


        var runBaseState = function(){
            agentBaseState(execution.project+"/"+execution.username,req.body.executionID,foundMachine.host,foundMachine.port,foundMachine.threadID,function(err){

                if (err){
                    testcase.result.error = err;
                    testcase.result.status = "Finished";
                    testcase.result.result = "Failed";
                    updateResult(testcase.result);
                    if (execution){
                        execution.currentTestCases[testcase.dbTestCase._id].result = "Failed";
                        finishTestCaseExecution(execution,req.body.executionID,execution.testcases[id]._id,execution.currentTestCases[testcase.dbTestCase._id]);
                    }
                }
                else{
                    foundMachine.runBaseState = true;
                    sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                }
            });
        };

        if (foundMachine.runBaseState === true){
            if (foundMachine.multiThreaded  == true){
                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
            }
            else{
                //make sure the files are actually there, in case of revert to snapshot or not persistent VMs files
                //could have changed while test case was running
                sendAgentCommand(foundMachine.host,foundMachine.port,{command:"files loaded",executionID:req.body.executionID},function(message){
                    if (message.loaded == true){
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions);
                    }
                    else{
                        runBaseState();
                    }
                });
            }

        }
        else{
            runBaseState();
        }

    });
};


//last action or we are done with the TC
//start next test case if there is one
function finishTestCaseExecution(execution,executionID,testcaseId,testcase){
    //updateExecutionTestCase({_id:execution.testcases[testcase.executionTestCaseID]._id},{$set:{"status":"Finished",result:testcase.result.result}});
    var date = new Date();
    var status = "Finished";
    if((testcase.result.result != "Passed") && (testcase.result.result != "Failed")){
        status = "Not Run";
    }
    var updateTC = function(){
        updateExecutionTestCase({_id:testcaseId},{$set:{trace:testcase.trace,"status":status,resultID:testcase.result._id.__id,result:testcase.result.result,error:testcase.result.error,enddate:date,runtime:date-testcase.testcase.startDate,host:"",vncport:""}});
        executionsRoute.updateExecutionTotals(executionID);
    };
    //update machine base state result
    if(execution.cachedTCs){
        if (testcase.testcase.machines.length > 0){
            updateExecutionMachine(executionID,testcase.testcase.machines[0]._id,testcase.result.result,testcase.result._id.__id,function(){
                updateTC();
            });
        }
        else{
            updateTC();
        }
        //updateExecutionMachine({testcase.testcase.machines[0]._id)},{$set:{result:testcase.result.result,resultID:testcase.result._id.__id}});
    }
    else{
        updateTC();
    }
    var count = 0;
    var retry = false;
    if(testcase.result.result == "Failed"){
        if (execution.testcases[testcase.executionTestCaseID].retryCount > 0){
            retry = true;
            execution.testcases[testcase.executionTestCaseID].retryCount--;
            execution.testcases[testcase.executionTestCaseID].executing = false;
        }
        if (execution.cachedTCs){
            execution.baseStateFailed = true;
        }
    }
    if(testcase.testcase.machines.length === 0){
        if (retry == false){
            //delete execution.testcases[testcase.executionTestCaseID];
            execution.testcases[testcase.executionTestCaseID].finished = true;
            execution.testcases[testcase.executionTestCaseID].executing = false;
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
                //delete execution.testcases[testcase.executionTestCaseID];
                execution.testcases[testcase.executionTestCaseID].finished = true;
                execution.testcases[testcase.executionTestCaseID].executing = false;
            }
            delete execution.currentTestCases[testcase.executionTestCaseID];
            if(execution.executingTCs != true){
                executeTestCases(execution.testcases,executionID);
            }
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

        if((location.indexOf("org.codehaus.") != -1) || (location.indexOf("java.lang.") != -1) || (location.indexOf("groovy.lang.") != -1) || (location.indexOf("redwood.launcher.") != -1)|| (location.indexOf("sun.reflect.") != -1)){
            if (line.indexOf("[") == 0){
                newTrace += line;
            }
            else{
                newTrace += ",\r\n"+line;
            }
            if (traceCount == traces.length){
                callback(newTrace);
            }
            return;
        }

        if ((fileName.indexOf(".groovy") != -1) ||(fileName.indexOf(".java") != -1)){
            sourceCache.forEach(function(file){
                if (found == true) return;
                if (file.indexOf("/"+fileName) != -1){//&&(file.indexOf(location.replace(/\./g,"/")) != -1)){
                //if ((file.indexOf("/"+fileName) != -1)&&(location.indexOf(file.replace()) == 0)){
                    found = true;
                    lineNumber = (parseInt(lineNumber,10)-1).toString();
                    newTrace += ",\r\n<a style= 'color: blue;' href='javascript:openScript(&quot;"+ file +"&quot;,&quot;"+ lineNumber +"&quot;)'>" + line +"</a>";
                    //newTrace += ",\r\n<a style= 'color: blue;' href='javascript:openScript(&quot;/src"+ file.dir+"/"+file.name +"&quot;,&quot;"+ lineNumber +"&quot;)'>" + line +"</a>";
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
        }
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


function agentBaseState(project,executionID,agentHost,port,threadID,callback){
    sendAgentCommand(agentHost,port,{command:"cleanup",executionID:executionID},function(message){
        if (message.error){
            callback(message.error);
            return;
        }
        syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/bin"),"executionfiles/"+executionID+"/bin",function(){
            syncFilesWithAgent(agentHost,port,path.join(__dirname, '../launcher'),"executionfiles/"+executionID+"/launcher",function(){
                syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/External Libraries"),"executionfiles/"+executionID+"/lib",function(){
                    syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/build/jar"),"executionfiles/"+executionID+"/lib",function(){
                        syncFilesWithAgent(agentHost,port,path.join(__dirname, '../launcher'),"executionfiles/"+executionID+"/launcher",function(){
                            sendAgentCommand(agentHost,port,{command:"start launcher",executionID:executionID,threadID:threadID},function(message){
                                if ((message) && (message.error)){
                                    callback(message.error);
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
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        console.log('sendFileToAgent problem with request: ' + e.message+ ' file:'+file);
    });

    req.write(message);
    readStream.pipe(req, { end: false });
    readStream.on("end", function(){
        req.end('\r\n------' + boundary + '--\r\n');
    });
}

function sendAgentCommand(agentHost,port,command,callback){
    console.log(command);
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
            try{
                var msg = JSON.parse(chunk);
            }
            catch(err){
                if (callback) callback(err);
            }

            if((msg )&&(msg.error != null)){
                if (callback) callback(msg.error);
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
        console.log('sendAgentCommand'+ command.command +' problem with request: ' + e.message);
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
            if(err) console.log("ERROR updating execution: "+err);
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

function verifyMachineState(machines,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(machine._id)}, {}, function(err, dbMachine) {

                if(dbMachine.maxThreads < dbMachine.takenThreads + machine.threads)
                {
                    callback("Machine: "+ machine.host+" has reached thread limit.");
                    machineCount = machines.length+1;
                    return;
                }
                machineCount++;
                if (machineCount == machines.length){
                    if(callback) callback();
                }
            });
        });
    });
}


function lockMachines(machines,executionID,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        updateExecutionMachine(executionID,machine._id,"","");
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(machine._id)}, {}, function(err, dbMachine) {
                if(dbMachine.maxThreads < dbMachine.takenThreads + machine.threads)
                {
                    callback("Machine: "+ machine.host+" has reached thread limit.");
                    return;
                }
                if(dbMachine != null) {
                    var takenThreads = 1;
                    if (dbMachine.takenThreads){
                        takenThreads = dbMachine.takenThreads + machine.threads;
                    }
                    else{
                        takenThreads = machine.threads;
                    }
                    updateMachine({_id:db.bson_serializer.ObjectID(machine._id)},{$set:{takenThreads:takenThreads,state:"Running "+takenThreads+ " of " + machine.maxThreads}},function(){
                        machineCount++;
                        if (machineCount == machines.length){
                            if(callback) callback();
                        }
                    })
                }
                else{
                    if(callback) callback();
                }
            })
        });
    });
}

function unlockMachines(allmachines,callback){
    var machineCount = 0;
    var machines = allmachines.slice(0);
    console.log(machines);
    var nextMachine = function(){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(machines[machineCount]._id)}, {}, function(err, dbMachine) {
                console.log(dbMachine);
                if(dbMachine != null) {
                    var takenThreads = 1;
                    if (dbMachine.takenThreads){
                        takenThreads = dbMachine.takenThreads - 1;
                    }
                    else{
                        takenThreads = 0;
                    }
                    var state = "";
                    console.log("now taken are:"+takenThreads);
                    if (takenThreads > 0) state = "Running "+takenThreads+ " of " + dbMachine.maxThreads;

                    updateMachine({_id:dbMachine._id},{$set:{takenThreads:takenThreads,state:state}},function(){
                    //updateMachine({_id:db.bson_serializer.ObjectID(dbMachine._id)},{$set:{takenThreads:takenThreads,state:state}},function(){
                        machineCount++;
                        if (machineCount == machines.length){
                            if(callback) callback();
                        }
                        else{
                            nextMachine();
                        }
                    })
                }
                else{
                    if(callback) callback();
                }
            })
        });
    };
    if (machines.length > 0){
        nextMachine();
    }
    else{
        if(callback) callback();
    }
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
            if(param.parametertype == "Boolean"){
                if(param.paramvalue == "TRUE"){
                    param.paramvalue = true;
                }
                else if(param.paramvalue == "FALSE"){
                    param.paramvalue = false;
                }


            }
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


function deleteOldResult(testcaseID,executionID,callback){
    db.collection('testcaseresults', function(err, collection) {
        collection.findOne({testcaseID:db.bson_serializer.ObjectID(testcaseID),executionID:executionID}, {}, function(err, result) {
            if(result == null) {
                if(callback) callback();
                return;
            }
            if(result.screenshot){
                db.collection('screenshots', function(err, SHCollection) {
                    SHCollection.remove({_id:result.screenshot});
                })
            }
            if(callback) callback();
            collection.remove({_id:result._id},{safe:true},function(err){});
        })
    });
}


function GetTestCaseDetails(testcaseID,executionID,callback){
    var testcaseDetails = {};
    var testcaseResults = {};
    var hosts = [];

    var getActionDetails = function(nextAction,lastPoint,lastResultPoint,cb){
        db.collection('actions', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(nextAction.actionid)}, {}, function(err, action) {
                if(action == null){
                    cb();
                    return;
                }
                lastPoint.name = action.name;
                lastResultPoint.name = action.name;
                lastResultPoint.actionStatus = action.status;
                if (action.status != "Automated"){
                    if (executions[executionID].ignoreStatus != true){
                        testcaseDetails.statusError = "One ore more actions inside the test case are not in automated state.";
                        lastResultPoint.error = "Action " + action.status;
                    }
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
                        action.collection.forEach(function(innerAction,index){
                            if ((innerAction.host != "")&&(hosts.indexOf(innerAction.host) == -1)){
                                hosts.push(innerAction.host)
                            }
                            if(lastPoint.dbAction.executionflow == "Ignore Error Continue Test Case"){innerAction.executionflow = "Ignore Error Continue Test Case"}
                            if((lastPoint.dbAction.executionflow == "Record Error Continue Test Case")&&(innerAction.executionflow != "Ignore Error Continue Test Case"))
                            {innerAction.executionflow = "Record Error Continue Test Case"}
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

    deleteOldResult(testcaseID,executionID,function(){
        db.collection('testcases', function(err, collection) {
            collection.findOne({_id:db.bson_serializer.ObjectID(testcaseID)}, {}, function(err, testcase) {
                if(testcase == null) callback(null);
                if (testcase.type == "script"){
                    testcaseDetails = {dbTestCase:testcase,script:testcase.script};
                    testcaseResults = {name:testcase.name,testcaseID:testcase._id,script:testcase.script,leaf:true};
                    callback(testcaseDetails,testcaseResults,[]);
                }
                else{
                    //now process after state
                    var afterStatePresent = false;
                    if((testcase.afterState) && (testcase.afterState != "") &&(executions[executionID].ignoreAfterState == false)){
                        afterStatePresent = true;
                        var stateOrder = (testcase.collection.length+1).toString();
                        testcase.collection.push({order:stateOrder,host:"Default",actionid:testcase.afterState,parameters:[],executionflow:"Record Error Stop Test Case",afterState:true});
                    }
                    if (testcase.collection.length > 0){
                        testcaseDetails = {dbTestCase:testcase,actions:[],afterState:afterStatePresent};
                        testcaseResults = {name:testcase.name,testcaseID:testcase._id,children:[]};
                        var pending = testcase.collection.length;

                        testcase.collection.forEach(function(innerAction,index){
                            if ((innerAction.host != "")&&(hosts.indexOf(innerAction.host) == -1)){
                                hosts.push(innerAction.host)
                            }
                            var newActionResult = {order:index+1,actionid:innerAction.actionid,parameters:innerAction.parameters,status:"Not Run",expanded:false,children:[],executionflow:innerAction.executionflow};
                            //var newActionResult = {order:innerAction.order,actionid:innerAction.actionid,parameters:innerAction.parameters,status:"Not Run",expanded:false,children:[],executionflow:innerAction.executionflow};
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
                                if (!--pending) {
                                    callback(testcaseDetails,testcaseResults,hosts);
                                }
                            });
                        });
                    }
                    else{
                        callback({dbTestCase:testcase,actions:[]},{name:testcase.name,testcaseID:testcase._id,children:[]},[]);
                    }
                }
            })
        })
    });
}

function sendNotification(executionID){
    db.collection('emailsettings', function(err, collection) {
        db.collection('executions', function(err, EXEcollection) {
            collection.findOne({}, {}, function(err, settings) {
                EXEcollection.findOne({_id:executionID}, {}, function(err, execution) {
                    if(!execution.emails) return;
                    if(execution.emails.length == 0) return;
                    if((!settings.host) || (settings.host == "")) return;
                    var options = {};

                    var subject = "Execution FINISHED: " + execution.name;
                    if(parseInt(execution.failed) > 0){
                        subject = subject + " (CONTAINS FAILURES)"
                    }
                    else{
                        subject = subject + " (ALL PASSED)"
                    }

                    var body = "<p><a href='http://" + settings.serverHost+ ":" + common.Config.AppServerPort + "/index.html?execution=" + execution._id + "&project=" + execution.project + "'>Execution: " + execution.name + "</a></p>";

                    body = body + '<p><table border="1" cellpadding="3">' +
                        '<tr>' +
                        '<td><b>Total</b></td>' +
                        '<td><b>'+execution.total+'</b></td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td>Passed</td>' +
                            '<td style="color:green">'+execution.passed+'</td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td>Failed</td>' +
                            '<td style="color:red">'+execution.failed+'</td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td>Not Run</td>' +
                            '<td style="color:#ffb013">'+execution.notRun+'</td>' +
                        '</tr>' +
                    '</table></p>';
                    if(settings.user){
                        options.auth = {user:settings.user,pass:settings.password}
                    }
                    options.host = settings.host;
                    if((settings.port)&&(settings.port!="")){
                        options.port = parseInt(settings.port);
                    }
                    else{
                        options.port = 25
                    }
                    var smtpTransport = nodemailer.createTransport("SMTP",options);
                    var toList = "";
                    execution.emails.forEach(function(email){
                        if(toList == ""){
                            toList = email
                        }
                        else{
                            toList = toList + "," + email
                        }
                    });
                    var mailOptions = {
                        from: "redwoodhq-no-reply@redwoodhq.com",
                        to: toList,
                        subject: subject,
                        //text: "Hello world", // plaintext body
                        html: body // html body
                    };

                    smtpTransport.sendMail(mailOptions, function(error, response){
                        if(error){
                            console.log(error);
                        }

                        smtpTransport.close();
                    });
                });
            });
        })
    });
}

