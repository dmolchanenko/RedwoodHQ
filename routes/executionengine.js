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
var spawn = require('child_process').spawn;
var os = require('os');
var archiver = require('archiver');
var db;
var compilations = {};
var fileSync = {};
var ObjectID = require('mongodb').ObjectID;

exports.stopexecutionPost = function(req, res){
    var execution = executions[req.body.executionID];
    if(!execution) {
        res.contentType('json');
        res.json({success:true});
        //update execution status in DB anyway
        updateExecution({_id:req.body.executionID},{$set:{status:"Ready To Run"}},true);
        return;
    }
    if(execution.fileReqs){
        execution.fileReqs.forEach(function(req){
            req.end();
            req.destroy();
        })
    }

    cleanUpMachines(execution.machines,req.body.executionID);
    unlockMachines(execution.machines);
    unlockCloudMachines(execution.machines);
    for(var testcase in execution.currentTestCases){
        if(execution.currentTestCases[testcase].testcase.dbTestCase.tcData && execution.currentTestCases[testcase].testcase.dbTestCase.tcData.length > 0){
            updateExecutionTestCase({_id:execution.testcases[testcase]._id},{$set:{status:"Not Run","result":"",resultID:null,error:"",trace:"",startdate:"",enddate:"",runtime:""}});
        }
        else{
            updateExecutionTestCase({_id:execution.testcases[testcase]._id},{$set:{status:"Not Run","result":"",resultID:null,error:"",trace:"",startdate:"",enddate:"",runtime:""}});
        }
    }
    //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),os.tmpDir()+"jar_"+req.body.executionID);
    deleteDir(os.tmpDir()+"/jar_"+req.body.executionID);
    common.logger.log("Stop button was pushed");
    cleanExecutionMachines(req.body.executionID,function(){
        updateExecution({_id:req.body.executionID},{$set:{status:"Ready To Run"}},true,function(){
            executionsRoute.updateExecutionTotals(req.body.executionID);
            res.contentType('json');
            res.json({success:true});
            delete executions[req.body.executionID];
        });
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
    var allScreenshots =  req.body.allScreenshots;
    var ignoreAfterState =  req.body.ignoreAfterState;
    var sendEmail =  req.body.sendEmail;
    var machines = req.body.machines;
    var variables = {};
    var testcases = req.body.testcases;
    var template = null;

    //clean up previous files if needed
    /*
    for(var file in fileSync){
        if (file.indexOf() != "_id"){
            record.getAt(0).set(propt,item[propt]);
        }
    }
    */

    req.body.variables.forEach(function(variable){
        variables[variable.name] = variable.value;
    });

    var machineConflict = false;
    var updatingConflict = false;
    machines.forEach(function(machine){
        if (machine.state == "Running Test"){
            machineConflict = true;
        }
        else if (machine.state == "Updating"){
            updatingConflict = true;
        }

    });

    if(machineConflict == true){
        res.contentType('json');
        res.json({error:"Selected machines are currently running other tests."});
        return;
    }

    if(updatingConflict == true){
        res.contentType('json');
        res.json({error:"Selected machines are being updated."});
        return;
    }

    if(executions[executionID]){
        res.contentType('json');
        res.json({error:"Execution is already running."});
        return;
    }

    if(req.body.templates){
        template = req.body.templates[0]
    }

    executions[executionID] = {template:template,sendEmail:sendEmail,ignoreAfterState:ignoreAfterState,ignoreStatus:ignoreStatus,ignoreScreenshots:ignoreScreenshots,allScreenshots:allScreenshots,testcases:{},machines:machines,variables:variables,currentTestCases:{},project:req.cookies.project,username:req.cookies.username,returnVars:{}};
    updateExecution({_id:executionID},{$set:{status:"Running",user:req.cookies.username}},false);

    compileBuild(req.cookies.project,req.cookies.username,function(err){
        if (err != null){
            res.contentType('json');
            res.json({error:"Unable to compile scripts."});
            updateExecution({_id:executionID},{$set:{status:"Ready To Run"}},true);
            delete executions[executionID];
        }
        else{
            //copy files for each execution to prevent conflicts
            //git.copyFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),"jar",os.tmpDir()+"/jar_"+executionID,function(){
            copyFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),os.tmpDir()+"/jar_"+executionID,function(){
                copyFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build/jar"),os.tmpDir()+"/jar_"+executionID,function(){
                    zipPythonFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username),os.tmpDir()+"/jar_"+executionID,function(){
                        cacheSourceCode(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username),function(sourceCache){
                            if(executions[executionID]){
                                executions[executionID].sourceCache = sourceCache;
                            }
                            else{
                                return;
                            }
                            verifyMachineState(machines,function(err){
                                if(err){
                                    updateExecution({_id:executionID},{$set:{status:"Ready To Run"}},true);
                                    res.contentType('json');
                                    res.json({error:err});
                                    //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),os.tmpDir()+"/jar_"+req.body.executionID);
                                    deleteDir(os.tmpDir()+"/jar_"+req.body.executionID);
                                    delete executions[executionID];
                                    return;
                                }
                                VerifyCloudCapacity(executions[executionID].template,function(response){
                                    if(response.err || response.capacityAvailable == false){
                                        var message = "";
                                        if(response.err){
                                            message = response.err
                                        }
                                        else{
                                            message = "Cloud does not have the capacity to run this execution."
                                        }
                                        updateExecution({_id:executionID},{$set:{status:"Ready To Run",cloudStatus:"Error: "+message}},true);
                                        res.contentType('json');
                                        res.json({error:"Cloud Error: "+message});
                                        //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),os.tmpDir()+"/jar_"+req.body.executionID);
                                        deleteDir(os.tmpDir()+"/jar_"+req.body.executionID);
                                        delete executions[executionID];
                                        return;
                                    }
                                    res.contentType('json');
                                    res.json({success:true});
                                    lockMachines(machines,executionID,function(){
                                        if(executions[executionID].template){
                                            updateExecution({_id:executionID},{$set:{status:"Running",cloudStatus:"Provisioning Virtual Machines..."}},false);
                                        }
                                        else{
                                            updateExecution({_id:executionID},{$set:{status:"Running",cloudStatus:""}},false);
                                        }
                                        StartCloudMachines(template,executionID,function(cloudMachines){
                                            if(cloudMachines.err){
                                                unlockMachines(machines);
                                                updateExecution({_id:executionID},{$set:{status:"Ready To Run",cloudStatus:"Error: "+cloudMachines.err}},true);
                                                //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+req.cookies.project+"/"+req.cookies.username+"/build"),os.tmpDir()+"/jar_"+req.body.executionID);
                                                deleteDir(os.tmpDir()+"/jar_"+req.body.executionID);
                                                delete executions[executionID];
                                                return;
                                            }
                                            if(executions[executionID].template){
                                                updateExecution({_id:executionID},{$set:{cloudStatus:"Virtual Machines have been provisioned."}},false);
                                            }
                                            executions[executionID].machines = machines.concat(cloudMachines);
                                            getGlobalVars(executionID,function(){
                                                testcases.forEach(function(testcase){
                                                    testcase.dbID = testcase.testcaseID;
                                                    if(testcase.tcData){
                                                        testcase.testcaseID = testcase.testcaseID+testcase.rowIndex;
                                                        executions[executionID].testcases[testcase.testcaseID] = testcase;
                                                    }
                                                    else{
                                                        executions[executionID].testcases[testcase.testcaseID] = testcase;
                                                    }
                                                });
                                                //see if there is a base state
                                                suiteBaseState(executionID,executions[executionID].machines,function(){
                                                    //magic happens here
                                                    applyMultiThreading(executionID,function(){
                                                        updateExecution({_id:executionID},{$set:{status:"Running",lastRunDate:new Date()}},false,function(){
                                                            executeTestCases(executions[executionID].testcases,executionID);
                                                        });
                                                    })
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    });
};

function zipPythonFiles(projectDir,destDir,callback){
    fs.exists(projectDir + "/PythonWorkDir",function(exists){
        if(exists == true){
            git.lsFiles(projectDir + "/src/",["*.py"],function(data){
                if ((data != "")&&(data.indexOf("\n") != -1)){
                    zipDir(projectDir + "/PythonWorkDir/Lib",destDir+"/pythonLibs.zip",['**','!**.pyc','!**/*.pyc'],function(){
                        zipDir(projectDir + "/src/",destDir+"/pythonSources.zip",['**/*.py','**.py'],function(){
                            callback();
                        });
                    })
                }
                else{
                    callback();
                }
            });
        }
        else{
            callback()
        }
    });
}

function zipDir(sourceDir,targetFile,pattern,callback){
    fs.exists(sourceDir,function(exists){
        if(exists == true){
            var output = fs.createWriteStream(targetFile);
            /*
            var archive = archiver('tar', {
                gzip: true,
                gzipOptions: {
                    level: 1
                }
            });
            */
            var archive = archiver('zip');

            output.on('close', function () {
                output.end();
                callback();
                console.log(archive.pointer() + ' total bytes');
                console.log('archiver has been finalized and the output file descriptor has closed.');
            });

            archive.on('error', function(err){
                console.log(err);
                //throw err;
            });

            archive.pipe(output);
            archive.bulk([
                { expand: true, cwd: sourceDir, src: pattern}
            ]);
            archive.finalize();
        }
        else{
            callback()
        }
    })
}

exports.compileBuild = function(project,username,callback){compileBuild(project,username,callback)};

function compileBuild(project,username,callback){
    var workDir = rootDir+project+"/"+username;
    var msg = {project:project,username:username,java:true,python:true,csharp:true};

    var compileScripts = function(){
        var compileOut = "";
        //random id for compile proc
        var id;
        for (var i = 0; i < 24; i++) {
            id += Math.floor(Math.random() * 10).toString(16);
        }

        compile.operation(msg,id,function(data){compileOut = compileOut + data},function(){
            if (compileOut.indexOf("BUILD FAILED") != -1){
                callback("unable to compile")
            }
            else{
                callback(null)
            }

        })
    };
    needToCompileJava(workDir,project,function(compileJava){
        msg.java = compileJava;
        needToCompilePython(workDir,project,username,function(compilePython){
            msg.python = compilePython;
            needToCompileCSharp(workDir,project,function(compileCSharp){
                msg.csharp = compileCSharp;
                compileScripts();
            })
        })
    })


}

function needToCompilePython(workDir,project,username,callback){
    var needToCompile = true;
    if(compilations[project+username+"python"]){
        git.filesModifiedSinceDate(workDir,compilations[project+username+"python"],function(data){
            if (data == ""){
                needToCompile = false;
            }
            else{
                compilations[project+username+"python"] = new Date();
            }
            callback(needToCompile)
        });
    }
    else{
        compilations[project+username+"python"] = new Date();
        callback(needToCompile);
    }
}

function needToCompileJava(workDir,project,callback){
    var needToCompile = true;
    fs.exists(workDir+"/build/jar/"+project+".jar", function (exists) {
        if(exists == true){
            fs.stat(workDir+"/build/jar/"+project+".jar",function(err,stats){
                if(err) {
                    callback(needToCompile);
                }
                else{
                    git.filesModifiedSinceDate(workDir,stats.mtime,function(data){
                        if (data == ""){
                            needToCompile = false;
                        }
                        callback(needToCompile)
                    });
                }
            });
        }
        else{
            callback(needToCompile);
        }
    });
}

function needToCompileCSharp(workDir,project,callback){
    var needToCompile = true;
    fs.exists(workDir+"/build/RedwoodHQAutomation.dll", function (exists) {
        if(exists == true){
            fs.stat(workDir+"/build/RedwoodHQAutomation.dll",function(err,stats){
                if(err) {
                    callback(needToCompile);
                }
                else{
                    git.filesModifiedSinceDate(workDir,stats.mtime,function(data){
                        if (data == ""){
                            needToCompile = false;
                        }
                        callback(needToCompile)
                    });
                }
            });
        }
        else{
            callback(needToCompile);
        }
    });
}


function applyMultiThreading(executionID,callback){
    var count = 0;
    var mainMachinesCount = executions[executionID].machines.length;
    executions[executionID].machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:new ObjectID(machine._id)}, {}, function(err, dbMachine) {
                var startThread = 0;
                if(dbMachine){
                    startThread = dbMachine.takenThreads - machine.threads;
                }
                //if(startThread != 0){
                //    startThread = dbMachine.lastStartThread + 1
                //}

                //collection.findAndModify({_id:new ObjectID(machine._id)},{},{$set:{lastStartThread:startThread}},{safe:true,new:true},function(err,data){
                //});
                common.logger.info("staring at:"+startThread);
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
                            common.logger.info(newMachine);
                            if(!executions[executionID]) return;
                            executions[executionID].machines.push(newMachine);
                            sendAgentCommand(newMachine.host,newMachine.port,{command:"start launcher",executionID:executionID,threadID:newMachine.threadID},3,function(err){
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
                collection.insert({baseState:true,name:machine.host+"_state",status:"Automated",type:"collection",collection:[{order:"1",actionid:machine.baseState,host:machine.host,executionflow:"Record Error Stop Test Case",parameters:[]}]}, {safe:true},function(err,testcaseData){
                    db.collection('executiontestcases', function(err, collection) {
                        //collection.save({_id:machine.resultID},{},{$set:{executionID:executionID,name:machine.host+"_state",status:"Not Run",testcaseID:testcaseData[0]._id.__id,_id: machine.resultID}}, {safe:true,new:true},function(err,returnData){
                        collection.save({baseState:true,executionID:executionID,name:machine.host+"_state",status:"Not Run",testcaseID:testcaseData[0]._id.toString(),_id: machine.baseStateTCID},function(err,returnData){
                            suiteBaseTCs.push({testcaseID:testcaseData[0]._id.toString(),retryCount:0,_id:machine.baseStateTCID,status:"Not Run",name:machine.host+"_state",type:"collection"});
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

exports.cacheSourceCode = function(rootPath,callback){cacheSourceCode(rootPath,callback)};

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
        sendAgentCommand(machine.host,machine.port,{command:"cleanup",executionID:executionID},3,function(err){
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
                unlockCloudMachines(executions[executionID].machines);
                unlockMachines(machines,function(){
                    cleanUpMachines(executions[executionID].machines,executionID,function(){

                    });
                    updateExecution({_id:executionID},{$set:{status:"Ready To Run"}},true,function(){
                        executionsRoute.updateExecutionTotals(executionID,function(){
                            if(executions[executionID].sendEmail == true) sendNotification(executionID);
                            //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+executions[executionID].project+"/"+executions[executionID].username+"/build"),os.tmpDir()+"/jar_"+executionID);
                            deleteDir(os.tmpDir()+"/jar_"+executionID);
                            delete executions[executionID];
                        });
                    });
                    callback(true)
                });
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
            if(executions[executionID]){
                var shouldFinish = true;
                //if something is running dont finish the execution
                for(var tc in executions[executionID].testcases) {
                    if(tc.finished == false) shouldFinish = false;
                }
                if(shouldFinish == false) return;
                unlockCloudMachines(executions[executionID].machines);
                unlockMachines(executions[executionID].machines,function(){
                    if(!executions[executionID]) return;
                    cleanUpMachines(executions[executionID].machines,executionID,function(){

                    });
                    updateExecution({_id:executionID},{$set:{status:"Ready To Run"}},true,function(){
                        executionsRoute.updateExecutionTotals(executionID,function(){
                            if(executions[executionID] && executions[executionID].sendEmail == true) sendNotification(executionID);
                            //git.deleteFiles(path.join(__dirname, '../public/automationscripts/'+executions[executionID].project+"/"+executions[executionID].username+"/build"),os.tmpDir()+"/jar_"+executionID);
                            deleteDir(os.tmpDir()+"/jar_"+executionID);
                            delete executions[executionID];
                        });
                    });
                    callback(true)
                });
            }
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
        startTCExecution(testcases[tcArray[count]].testcaseID,testcases[tcArray[count]].dbID,variables,executionID,function(){
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

function startTCExecution(id,dbID,variables,executionID,callback){
    GetTestCaseDetails(id,dbID,executionID,function(testcase,result,hosts){
        if(testcase == null){
            callback();
            return;
        }
        //if(executions[executionID].testcases[id].tcData && executions[executionID].testcases[id].tcData != ""){
        //    testcase.tcData = executions[executionID].testcases[id].tcData;
        //}
        testcase.variables = {};
        testcase.machines = [];
        testcase.machineVars = [];
        var reservedHosts = [];
        var busyMachines = false;
        if(!executions[executionID]) return;
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
        result.status = "Running";
        createResult(result,function(writtenResult){
            result._id = writtenResult[0]._id;
            result.executionID = executionID;
            if(executions[executionID].testcases[id].tcData && executions[executionID].testcases[id].tcData != ""){
                result.tcData = executions[executionID].testcases[id].tcData;
                result.rowIndex = executions[executionID].testcases[id].rowIndex;
            }
            if(!executions[executionID]) return;
            executions[executionID].currentTestCases[id] = {testcase:testcase,result:result,executionTestCaseID:id};

            for (var attrname in testcase.machineVars) { testcase.variables[attrname] = testcase.machineVars[attrname]; }
            for (var attrname in variables) { testcase.variables[attrname] = variables[attrname]; }
            if(result.rowIndex){
                testcase.variables["Framework.TestCaseName"] = testcase.dbTestCase.name+"_"+result.rowIndex;
            }
            else{
                testcase.variables["Framework.TestCaseName"] = testcase.dbTestCase.name;
            }
            if (result.tcData){
                for (var tcDataColumn in result.tcData) { testcase.variables["TCData."+tcDataColumn] = result.tcData[tcDataColumn]; }
            }
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
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
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
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
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
                finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
                callback();
                return;
            }

            var count = 0;
            var errorFound = false;

            //var startTC = function(){

            //var agentInstructions = {command:"run action",executionID:executionID,testcaseID:testcase.dbTestCase._id,variables:executions[executionID].variables};
            var agentInstructions = {command:"run action",executionID:executionID,testcaseID:id,variables:executions[executionID].variables};

            var foundMachine = null;

            var runBaseState = function(){
                agentBaseState(executions[executionID].project+"/"+executions[executionID].username,executionID,foundMachine.host,foundMachine.port,foundMachine.threadID,function(err){

                    if (err){
                        result.error = err.error;
                        result.status = "Finished";
                        result.result = "Failed";
                        updateResult(result);
                        if (executions[executionID] && executions[executionID].currentTestCases[id]){
                            executions[executionID].currentTestCases[id].result = result;
                            finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
                        }
                    }
                    else{
                        foundMachine.runBaseState = true;
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,3);
                    }
                });
            };

            //if test case is a script and NOT an action collection
            if (testcase.dbTestCase.type !== "collection"){
                if ((testcase.script == "") || (!testcase.script)){
                    result.error = "Test Case does not have a script assigned";
                    result.status = "Finished";
                    result.result = "Failed";
                    updateResult(result);
                    //executions[executionID].testcases[id].result = result;
                    finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
                    return;
                }
                agentInstructions.name = testcase.name;
                agentInstructions.ignoreScreenshots = executions[executionID].ignoreScreenshots;
                agentInstructions.allScreenshots = executions[executionID].allScreenshots;
                agentInstructions.executionID = executionID;
                agentInstructions.testcaseName = testcase.name;
                agentInstructions.script = testcase.script;
                agentInstructions.scriptLang = testcase.scriptLang;
                agentInstructions.resultID = result._id.toString();
                agentInstructions.parameters = [];
                agentInstructions.type = testcase.dbTestCase.type;

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
                if (foundMachine.runBaseState === true){
                    if (foundMachine.multiThreaded  == true){
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,30);
                    }
                    else{
                        //make sure the files are actually there, in case of revert to snapshot or not persistent VMs files
                        //could have changed while test case was running
                        sendAgentCommand(foundMachine.host,foundMachine.port,{command:"files loaded",executionID:executionID},30,function(message){
                            if (message.loaded == true){
                                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,30);
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

                callback();
                return;
            }

            findNextAction(testcase.actions,testcase.variables,function(action){
                if (!executions[executionID]) return;
                if(!executions[executionID].currentTestCases[id]) return;
                if(action == null){
                    finishTestCaseExecution(executions[executionID],executionID,executions[executionID].testcases[id]._id,executions[executionID].currentTestCases[id]);
                    return;
                }

                executions[executionID].currentTestCases[id].currentAction = action;

                agentInstructions.name = action.name;
                agentInstructions.executionflow = action.dbAction.executionflow;
                agentInstructions.executionID = executionID;
                agentInstructions.ignoreScreenshots = executions[executionID].ignoreScreenshots;
                agentInstructions.allScreenshots = executions[executionID].allScreenshots;
                agentInstructions.returnValueName = action.dbAction.returnvalue;
                agentInstructions.testcaseName = testcase.dbTestCase.name;
                agentInstructions.script = action.script;
                agentInstructions.scriptLang = action.scriptLang;
                agentInstructions.resultID = result._id.toString();
                agentInstructions.parameters = [];
                action.dbAction.parameters.forEach(function(parameter){
                    agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
                });

                var actionHost = "Default";
                if(action.dbAction.host != "") actionHost = action.dbAction.host;
                testcase.machines.forEach(function(machine){
                    if ((machine.roles.indexOf(actionHost) != -1)&&(foundMachine == null)){
                        foundMachine = machine;
                    }
                });

                callback();
                agentInstructions.threadID = foundMachine.threadID;
                updateExecutionTestCase({_id:executions[executionID].testcases[id]._id},{$set:{"status":"Running","result":"",error:"",trace:"",resultID:result._id,startdate:testcase.startDate,enddate:"",runtime:"",host:foundMachine.host,vncport:foundMachine.vncport}},foundMachine.host,foundMachine.vncport);
                if ((testcase.machines.length > 0) &&((testcase.machines[0].baseState))){
                    updateExecutionMachine(executionID,testcase.machines[0]._id,"",result._id.toString());
                }
                executionsRoute.updateExecutionTotals(executionID);

                if (foundMachine.runBaseState === true){
                    if (foundMachine.multiThreaded  == true){
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,30);
                    }
                    else{
                        //make sure the files are actually there, in case of revert to snapshot or not persistent VMs files
                        //could have changed while test case was running
                        sendAgentCommand(foundMachine.host,foundMachine.port,{command:"files loaded",executionID:executionID},30,function(message){
                            if (message.loaded == true){
                                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,30);
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
    var insertLogMessage = function(record){
        var executionID = record.executionID.replace(/-/g, '');
        delete record.command;
        delete record.executionID;

        db.collection('executionlogs'+executionID, function(err, collection) {
            collection.insert(record, {safe:true},function(err,returnData){
            });
        });
    };
    if(Array.isArray(req.body) == true){
        req.body.forEach(function(record){
            insertLogMessage(record);
        });
        realtime.emitMessage("AddExecutionLog",req.body);
    }
    else{
        insertLogMessage(req.body);
        realtime.emitMessage("AddExecutionLog",[req.body]);
    }
    res.contentType('json');
    res.set('Connection','Close');
    res.json({success:true});
};


exports.actionresultPost = function(req, res){
    res.contentType('json');
    res.set('Connection','Close');
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
                testcase.trace = trace;
                if(trace == "") testcase.result.trace = req.body.trace;
                updateResult(testcase.result);
            });
        }
        else{
            updateResult(testcase.result);
        }
        finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
        return;
    }

    var actionFlow = testcase.currentAction.dbAction.executionflow;
    testcase.currentAction.result.status = "Finished";

    testcase.currentAction.result.result = req.body.result;
    if (req.body.error && actionFlow != "Ignore Error Continue Test Case"){
        testcase.result.error = req.body.error;
        testcase.currentAction.result.error = req.body.error;
    }

    if(!testcase.result.error){
        testcase.result.error = "";
    }

    if (req.body.trace && actionFlow != "Ignore Error Continue Test Case"){
        testcase.result.trace = req.body.trace;
        testcase.currentAction.result.trace = req.body.trace;
        testcase.trace = req.body.trace;
    }

    if (req.body.screenshot){
        testcase.result.screenshot = req.body.screenshot;
        testcase.currentAction.result.screenshot = req.body.screenshot;
    }



    if ((req.body.returnValue)&&(testcase.currentAction.dbAction.returnvalue != "")){
        if(!execution.returnVars[req.body.testcaseID]){
            execution.returnVars[req.body.testcaseID] = {};
        }
        execution.returnVars[req.body.testcaseID][testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
        //.[testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
        //execution.variables[testcase.currentAction.dbAction.returnvalue] = req.body.returnValue;
    }

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
            //testcase.result.result = "";
            //testcase.result.error = "";
        }
    }


    var actionVariables = {};
    for (var attrname in testcase.testcase.variables) { actionVariables[attrname] = testcase.testcase.variables[attrname]; }
    for (var attrname in testcase.machineVars) { actionVariables[attrname] = testcase.machineVars[attrname]; }
    if(execution.returnVars[testcase.executionTestCaseID]){
        for (var attrname in execution.returnVars[testcase.executionTestCaseID]) { actionVariables[attrname] = execution.returnVars[testcase.executionTestCaseID][attrname]; }
    }

    findNextAction(testcase.testcase.actions,actionVariables,function(action){
        if(action == null){
            testcase.result.status = "Finished";
            if(testcase.result.result != "Failed") testcase.result.result = "Passed";
            markFinishedResults(testcase.result.children,execution.sourceCache,function(){
                updateResult(testcase.result);
            });
            finishTestCaseExecution(execution,req.body.executionID,execution.testcases[testcase.executionTestCaseID]._id,testcase);
            return;
        }
        else{
            markFinishedResults(testcase.result.children,execution.sourceCache,function(){
                updateResult(testcase.result);
            });
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

        var agentInstructions = {command:"run action",executionID:req.body.executionID,threadID:foundMachine.threadID,testcaseID:testcase.executionTestCaseID,variables:testcase.testcase.variables};

        execution.currentTestCases[testcase.executionTestCaseID].currentAction = action;

        agentInstructions.name = action.name;
        agentInstructions.executionflow = action.dbAction.executionflow;
        agentInstructions.executionID = req.body.executionID;
        agentInstructions.ignoreScreenshots = executions[req.body.executionID].ignoreScreenshots;
        agentInstructions.allScreenshots = executions[req.body.executionID].allScreenshots;
        agentInstructions.returnValueName = action.dbAction.returnvalue;
        agentInstructions.testcaseName = testcase.testcase.dbTestCase.name;
        agentInstructions.script = action.script;
        agentInstructions.scriptLang = action.scriptLang;
        agentInstructions.resultID = testcase.result._id.toString();
        agentInstructions.parameters = [];
        action.dbAction.parameters.forEach(function(parameter){
            agentInstructions.parameters.push({name:parameter.paramname,value:parameter.paramvalue});
        });

        var runBaseState = function(){
            agentBaseState(execution.project+"/"+execution.username,req.body.executionID,foundMachine.host,foundMachine.port,foundMachine.threadID,function(err){

                if (err){
                    testcase.result.error = err.error;
                    testcase.result.status = "Finished";
                    testcase.result.result = "Failed";
                    updateResult(testcase.result);
                    if (execution && testcase.dbTestCase){
                        execution.currentTestCases[testcase.executionTestCaseID].result = "Failed";
                        finishTestCaseExecution(execution,req.body.executionID,execution.testcases[id]._id,execution.currentTestCases[testcase.executionTestCaseID]);
                    }
                }
                else{
                    foundMachine.runBaseState = true;
                    sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,3);
                }
            });
        };

        if (foundMachine.runBaseState === true){
            if (foundMachine.multiThreaded  == true){
                sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,3);
            }
            else{
                //make sure the files are actually there, in case of revert to snapshot or not persistent VMs files
                //could have changed while test case was running
                sendAgentCommand(foundMachine.host,foundMachine.port,{command:"files loaded",executionID:req.body.executionID},3,function(message){
                    if (message.loaded == true){
                        sendAgentCommand(foundMachine.host,foundMachine.port,agentInstructions,3);
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
        updateExecutionTestCase({_id:testcaseId},{$set:{trace:testcase.trace,"status":status,resultID:testcase.result._id.toString(),result:testcase.result.result,error:testcase.result.error,enddate:date,runtime:date-testcase.testcase.startDate,host:"",vncport:""}});
        executionsRoute.updateExecutionTotals(executionID);
    };
    //update machine base state result
    if(execution.cachedTCs){
        if (testcase.testcase.machines.length > 0){
            updateExecutionMachine(executionID,testcase.testcase.machines[0]._id,testcase.result.result,testcase.result._id.toString(),function(){
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
            execution.returnVars[testcase.executionTestCaseID] = {};
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

exports.formatTrace = function(trace,sourceCache,callback){formatTrace(trace,sourceCache,callback)};

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
                if (file.indexOf("/"+fileName) != -1){
                    if(location.replace(/\./g, '/').indexOf(file.substring(0,file.lastIndexOf("/")).replace("src/", '')) != -1){
                        found = true;
                        var parsedLineNumber = (parseInt(lineNumber,10)-1).toString();
                        newTrace += ",\r\n<a style= 'color: blue;' href='javascript:openScript(&quot;"+ file +"&quot;,&quot;"+ parsedLineNumber +"&quot;)'>" + line +"</a>";
                    }
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
        else{
            if (traceCount == traces.length){
                callback(newTrace);
            }
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
                    if(trace != "") action.trace = trace;
                    returnValue();
                })
            }
            else{
                returnValue();
            }
        }
    });
}


exports.agentBaseState = function(project,executionID,agentHost,port,threadID,callback){agentBaseState(project,executionID,agentHost,port,threadID,callback)};

function agentBaseState(project,executionID,agentHost,port,threadID,callback){
    sendAgentCommand(agentHost,port,{command:"cleanup",executionID:executionID},3,function(message){
        if (message && message.error){
            callback(message);
            return;
        }
        if(executions[executionID]){
            executions[executionID].fileReqs = [];
        }
        else if(executionID.indexOf("unittest") == -1){
            return;
        }
        //os.tmpDir()+"/jar_"+executionID
        syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/bin"),"executionfiles/"+executionID+"/bin",executionID,function(error){
            if(error) {callback(error);return}
            syncFilesWithAgent(agentHost,port,path.join(__dirname, '../launcher'),"executionfiles/"+executionID+"/launcher",executionID,function(error){
                if(error) {callback(error);return}
                syncFilesWithAgent(agentHost,port,path.join(__dirname, '../public/automationscripts/'+project+"/External Libraries"),"executionfiles/"+executionID+"/lib",executionID,function(error){
                    if(error) {callback(error);return}
                    syncFilesWithAgent(agentHost,port,os.tmpDir()+"/jar_"+executionID,"executionfiles/"+executionID+"/lib",executionID,function(error){
                        if(error) {callback(error);return}
                        sendAgentCommand(agentHost,port,{command:"start launcher",executionID:executionID,threadID:threadID},3,function(message){
                            if ((message) && (message.error)){
                                callback(message);
                            }
                            else{
                                callback();
                            }
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

        sendFileToAgent(root+"/"+fileStats.name,dest,agentHost,port,3,function(){
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

function syncFilesWithAgent(agentHost,port,rootPath,destDir,executionID,callback){
    var walker = walk.walkSync(rootPath);
    var fileCount = 0;
    var files = [];
    var foundError = false;

    var sendFiles = function(){
        if(foundError) return;
        fileCount++;
        if (!files[fileCount-1]){
            callback();
            return;
        }
        sendFileToAgent(files[fileCount-1].file,files[fileCount-1].dest,agentHost,port,3,executionID,function(error){
            if(error){
                foundError = true;
                callback(error);
                return;
            }
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
        /*
        sendFileToAgent(root+"/"+fileStats.name,dest,agentHost,port,3,executionID,function(error){
            if(error){
                foundError = true;
                callback(error);
                return;
            }
            fileCount++;
            if(fileCount === files.length){
                callback();
            }
        })
        */
    });

    walker.on("end",function(){
        if(files.length == 0) callback();
        sendFiles();
    });
}

//if agent already got the file in cache don't copy
function matchFileWithAgent(file,dest,agentHost,port,retryCount,callback){

    var options = {
        hostname: agentHost,
        port: port,
        path: '/matchfile',
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

    var retryMatch = function(message){
        if(retryCount <= 0){
            if (callback) callback("Unable to connect to machine: "+agentHost + " error: " + message);
            common.logger.error('matchFileWithAgent problem with request: ' + message+ ' ');
        }
        else{
            retryCount--;
            setTimeout(matchFileWithAgent(file,dest,agentHost,port,retryCount,callback),1000)
        }
    };

    req.on('error', function(e) {
        retryMatch(e.message)
    });
    //fs.readFile(file, function(err, buf) {
        // write data to request body
        //req.write(JSON.stringify({dest:dest,file:file,md5:md5(buf)}));
    var md5sum = require("crypto").createHash('md5');
    var s = fs.ReadStream(file);
    fileSync[file] = s;
    s.on('data',function(d){
        md5sum.update(d);
    });

    s.on('error',function(err){
        s.destroy.bind(s);
        retryMatch("Unable to read file:"+file)
    });

    s.on('close',function(){
        var d = md5sum.digest('hex');
        this.destroy();
        req.write(JSON.stringify({dest:dest,file:file,md5:d.toString()}));
        req.end();
        //md5sum.end();
    });
    //});
}

function sendFileToAgent(file,dest,agentHost,port,retryCount,executionID,callback){
    if (file in fileSync){
        if(fileSync[file].close){
            fileSync[file].destroy();
            delete fileSync[file];
        }
    }
    fileSync[file] = true;
    matchFileWithAgent(file,dest,agentHost,port,0,function(response){
        if(response && response.matched == true){
            if(file in fileSync && fileSync[file].close){
                fileSync[file].destroy();
            }
            delete fileSync[file];
            if (callback) callback();
            return;
        }

        try{
            var stat = fs.statSync(file);

            var readStream = fs.createReadStream(file);
        }
        catch(e){
            if (callback) callback({error: "Can't read file: " + file + " " + e.message});
            return;
        }
        fileSync[file] = readStream;
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
                readStream.destroy();
                if (file in fileSync){
                    if(fileSync[file].close){
                        fileSync[file].destroy();
                        delete fileSync[file];
                    }
                }
                if (callback) callback();
            });
            res.on('close', function(){
                if(file in fileSync && fileSync[file].close){
                    fileSync[file].destroy();
                }
                delete fileSync[file];
                readStream.destroy.bind(readStream);
            });
        });

        if( executions[executionID] && executions[executionID].fileReqs){
            executions[executionID].fileReqs.push(req);
        }

        var handleError = function(e){
            readStream.destroy();
            if(file in fileSync && fileSync[file].close){
                fileSync[file].destroy();
            }
            delete fileSync[file];
            if(retryCount <= 0){
                if (callback) callback({error:'sendFileToAgent problem with request: ' + e.message+ ' file:'+file});
                common.logger.error('sendFileToAgent problem with request: ' + e.message+ ' file:'+file);
            }
            else{
                retryCount--;
                setTimeout(sendFileToAgent(file,dest,agentHost,port,retryCount,callback),1000)
            }
        };
        req.setTimeout(300000, function(){
            handleError({message:"Unable to connect to machine: "+agentHost + " CONNECTION TIMEOUT"});
            this.end();
        });
        req.on('error', function(e) {
            handleError(e);
            this.end();
        });

        req.write(message);
        //readStream.pipe(req, { end: false });
        readStream.on("error",function(e){
            this.end();
            handleError(e);
        }).pipe(req, { end: false });
        readStream.on("end", function(){
            try{
                req.end('\r\n------' + boundary + '--\r\n');
            }
            catch(e){
                //req.end();
                readStream.destroy();
            }
        });
        readStream.on('close',function(){
            if(file in fileSync && fileSync[file].close){
                fileSync[file].destroy();
            }
            delete fileSync[file];
        })
    })
}

exports.sendAgentCommand = function(agentHost,port,command,retryCount,callback){sendAgentCommand(agentHost,port,command,retryCount,callback)};

function sendAgentCommand(agentHost,port,command,retryCount,callback){
    common.logger.info(command);
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
    //req.setTimeout(50000, function(){
    //    if (callback) callback({error:"Unable to connect to machine: "+agentHost + " CONNECTION TIMEOUT"});
    //});
    req.on('error', function(e) {
        retryCount = 0;
        if(retryCount <= 0){
            if (callback) callback({error:"Unable to connect to machine: "+agentHost + " error: " + e.message});
            common.logger.error('sendAgentCommand problem with request: ' + e.message+ ' ');
        }
        else{
            retryCount--;
            setTimeout(sendAgentCommand(agentHost,port,command,retryCount,callback),3000)
        }
        //req.close();
    });

    // write data to request body
    req.write(JSON.stringify(command));
    req.end();
}


function resolveParamValue(value,variables){
    var returnNULL = false;

    var resolveVariable = function(stringValue){
        return stringValue.replace(new RegExp("\\$\\{([\\s\\w_.-]+)\\}", "g" ),function(a,b){
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
    };

    if(Object.prototype.toString.call(value) == '[object Array]'){
        if((value.length == 1) && (value[0] === "<NULL>")){
            return [];
        }
        else{
            var returnValue = [];
            value.forEach(function(arrayItem){
                returnValue.push(resolveVariable(arrayItem))
            });
            return returnValue;
        }
    }
    else if (typeof value != "string"){
        return value;
    }

    if (value.length > 4){
        if ((value.indexOf("$\{") == 0) &&(value.charAt(value.length -1) == "}") && (value.split("}").length > 1))
        {
            returnNULL = true;
        }
    }
    return resolveVariable(value);
}

function createResult(result,callback){
    db.collection('testcaseresults', function(err, collection) {
        result._id = new ObjectID(result._id);
        collection.insert(result, {safe:true},function(err,returnData){
            callback(returnData);
        });

    });
}

function updateResult(result,callback){
    db.collection('testcaseresults', function(err, collection) {
        collection.save(result,{safe:true},function(err,data){
            if(err) common.logger.error("ERROR updating results: "+err);
            if (callback){
                callback(err);
            }
            //realtime.emitMessage("UpdateResult",result);
            realtime.emitMessage("UpdateResult"+result._id.toString(),result);
        });
    });
}

function updateExecutionTestCase(query,update,machineHost,vncport,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            if(err) common.logger.error("ERROR updating results: "+err.message);
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

function updateExecution(query,update,finished,callback){
    db.collection('executions', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            if(err) {
                common.logger.error("ERROR updating execution: "+err.message);
                return;
            }
            realtime.emitMessage("UpdateExecutions",data);
            if(finished === true){
                realtime.emitMessage("FinishExecution",data);
            }
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

function cleanExecutionMachines(executionID,callback){
    db.collection('executions', function(err, collection) {
        collection.findOne({_id:executionID},function(err,data){
            //realtime.emitMessage("UpdateExecutions",data);

            if(data != null){
                data.machines.forEach(function(machine){
                    machine.result = "";
                    machine.resultID = "";
                });
                collection.save(data,{safe:true},function(err){
                    //realtime.emitMessage("UpdateExecutions",data);
                    if (callback) callback();
                });
            }
        });
    });
}

function updateMachine(query,update,callback){
    db.collection('machines', function(err, collection) {
        collection.findAndModify(query,{},update,{safe:true,new:true},function(err,data){
            if(data != null){
                realtime.emitMessage("UpdateMachines",{_id:data._id,state:data.state,takenThreads:data.takenThreads});
            }
            if (callback) callback();
        });
    });
}

exports.verifyMachineState = function(machines,callback){verifyMachineState(machines,callback)};

function verifyMachineState(machines,callback){
    var machineCount = 0;
    if(machines.length == 0 && callback) callback();
    machines.forEach(function(machine){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:new ObjectID(machine._id)}, {}, function(err, dbMachine) {

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

function GetRunningExecution(callback){
    db.collection('executions', function(err, collection) {
        var executions = [];
        collection.find({status:"Running"}, {}, function (err, cursor) {
            cursor.each(function (err, execution) {
                if (execution == null) {
                    callback(executions)
                }
                else{
                    executions.push(execution._id)
                }
            });
        });
    });
}

function VerifyCloudCapacity(template,callback){
    if(template == null) {
        callback({capacityAvailable:true});
        return;
    }
    db.collection('hosts', function(err, collection) {
        var hosts = [];
        collection.find({}, {}, function(err, cursor) {
            cursor.each(function(err, host) {
                if(host == null) {
                    if(hosts.length == 0){
                        callback({err:"Error: No hosts are found."});
                        return
                    }
                    GetRunningExecution(function(runningExecutions){
                        var appDir = path.resolve(__dirname,"../")+"/";
                        var proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"com.primatest.cloud.Main",JSON.stringify({operation:"capacityValidation",hosts:hosts,totalInstances:template.instances,templateName:template.name,runningExecutions:runningExecutions})]);

                        var cache = "";
                        proc.stdout.on('data', function (data) {
                            cache = cache + data.toString();
                            //console.log(data.toString());
                        });

                        proc.stderr.on('data', function (data) {
                            common.logger.error('Cloud stderr: ' + data.toString());
                        });

                        proc.on('close', function (code) {
                            var response = JSON.parse(cache);
                            callback(response);
                        });
                    })
                }
                hosts.push(host);
            });
        })
    });
}

function StartCloudMachines(template,executionID,callback){
    if(template == null) {
        callback([]);
        return;
    }
    db.collection('hosts', function(err, collection) {
        var hosts = [];
        collection.find({}, {}, function(err, cursor) {
            cursor.each(function(err, host) {
                if(host == null) {
                    if(hosts.length == 0){
                        callback({err:"Error: No hosts are found."});
                        return
                    }

                    var appDir = path.resolve(__dirname,"../")+"/";
                    //console.log(appDir+"vendor/Java/bin/java "+"-cp "+appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/* '+"com.primatest.cloud.Main \""+JSON.stringify({operation:"capacityValidation",hosts:hosts,totalInstances:totalInstances}).replace(/"/g,'\\"')+'"');
                    //console.log({operation:"startCloudMachines",hosts:hosts,template:template});
                    var proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"com.primatest.cloud.Main",JSON.stringify({operation:"startCloudMachines",hosts:hosts,template:template,executionID:executionID})]);

                    var cache = "";
                    proc.stdout.on('data', function (data) {
                        //console.log(data.toString());
                        cache = cache + data.toString();
                    });

                    proc.stderr.on('data', function (data) {
                        common.logger.error('Cloud stderr: ' + data.toString());
                        //callback({err:data.toString()})
                    });

                    /*
                    proc.on('exit', function (code) {
                        var response = JSON.parse(cache);
                        if(response.err){
                            callback(response);
                        }
                    });
                    */

                    proc.on('close', function (code) {
                        var response = JSON.parse(cache);
                        if(response.err){
                            callback(response);
                            return;
                        }
                        var cloudMachines = [];
                        response.forEach(function(machine,index){
                            cloudMachines.push({
                                host:machine.IP,
                                machineVars:[],
                                maxThreads:1000,
                                port:5009,
                                result:"",
                                roles:["Default"],
                                threads:template.threads,
                                vncport: 3006,
                                cloud:true,
                                vmName:machine.vmName,
                                vmHost:machine.host,
                                template:template.name
                            });
                            if(index == response.length-1){
                                callback(cloudMachines)
                            }
                        });
                    });
                    return;
                }
                else{
                    hosts.push(host);
                }
            });
        })
    });
}


function lockMachines(machines,executionID,callback){
    var machineCount = 0;
    if(machines.length == 0 && callback) callback();
    machines.forEach(function(machine){
        updateExecutionMachine(executionID,machine._id,"","");
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:new ObjectID(machine._id)}, {}, function(err, dbMachine) {
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
                    updateMachine({_id:new ObjectID(machine._id)},{$set:{takenThreads:takenThreads,state:"Running "+takenThreads+ " of " + machine.maxThreads}},function(){
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

function unlockCloudMachines(machines){
    var cloudMachines = [];
    machines.forEach(function(machine) {
        if(machine.cloud == true){
            if(machine.threads > 1){
                machine.threads --
            }
            else{
                delete machine.runningTC;
                cloudMachines.push(machine)
            }
        }
    });
    if(cloudMachines.length == 0) return;
    var appDir = path.resolve(__dirname,"../")+"/";
    //console.log(appDir+"vendor/Java/bin/java "+"-cp "+appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/* '+"com.primatest.cloud.Main \""+JSON.stringify({operation:"capacityValidation",hosts:hosts,totalInstances:totalInstances}).replace(/"/g,'\\"')+'"');
    //console.log(JSON.stringify({operation:"unlockVMs",machines:cloudMachines}))
    var proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"com.primatest.cloud.Main",JSON.stringify({operation:"unlockVMs",machines:cloudMachines})]);

    var cache = "";
    proc.stdout.on('data', function (data) {
        cache = cache + data.toString();
    });

    proc.stderr.on('data', function (data) {
        common.logger.error('Cloud stderr: ' + data.toString());
    });

    proc.on('close', function (code) {
    });
}

function unlockMachines(allmachines,callback){
    var machineCount = 0;
    var machines = allmachines.slice(0);
    common.logger.info(machines);
    unlockCloudMachines(allmachines);
    var nextMachine = function(){
        db.collection('machines', function(err, collection) {
            collection.findOne({_id:new ObjectID(machines[machineCount]._id)}, {}, function(err, dbMachine) {
                common.logger.info(dbMachine);
                if(dbMachine != null) {
                    var takenThreads = 1;
                    if (dbMachine.takenThreads){
                        takenThreads = dbMachine.takenThreads - 1;
                    }
                    else{
                        takenThreads = 0;
                    }
                    var state = "";
                    common.logger.info("now taken are:"+takenThreads);
                    if (takenThreads > 0) state = "Running "+takenThreads+ " of " + dbMachine.maxThreads;

                    updateMachine({_id:dbMachine._id},{$set:{takenThreads:takenThreads,state:state}},function(){
                    //updateMachine({_id:new ObjectID(dbMachine._id)},{$set:{takenThreads:takenThreads,state:state}},function(){
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
                    //if(callback) callback();
                    machineCount++;
                    if (machineCount == machines.length){
                        if(callback) callback();
                    }
                    else{
                        nextMachine();
                    }
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
            if (allDone == false){
                resolveParams(action,function(){
                        callback(action);
                        allDone = true;
                });
            }
        }
        else{
            if (allDone == false){
                resolveParams(action,function(){
                    findNextAction(action.actions,variables,function(action){
                        if ((action == null) &&(order == actions.length)){
                                callback(null);
                                allDone = true;
                        }
                        else if (action != null){
                            if (allDone == false){
                                resolveParams(action,function(){
                                        callback(action);
                                        allDone = true;
                                });
                            }
                        }
                    });
                })
            }
        }

    });
}


function deleteOldResult(resultID,executionID,callback){
    if(!resultID) {
        if(callback) callback();
        return;
    }
    db.collection('testcaseresults', function(err, collection) {
        collection.findOne({_id:new ObjectID(resultID),executionID:executionID}, {}, function(err, result) {
            if(result == null) {
                if(callback) callback();
                return;
            }
            if(result.screenshot){
                db.collection('screenshots', function(err, SHCollection) {
                    SHCollection.remove({_id:result.screenshot});
                })
            }
            db.collection('executionlogs'+executionID.replace(/-/g, ''), function(err, LogCollection) {
                if(err) return;
                LogCollection.remove({resultID:result._id});
            });
            if(callback) callback();
            collection.remove({_id:result._id},{safe:true},function(err){});
        })
    });
}


function GetTestCaseDetails(testcaseID,dbID,executionID,callback){
    var testcaseDetails = {};
    var testcaseResults = {};
    var hosts = [];

    var getActionDetails = function(nextAction,lastPoint,lastResultPoint,cb){
        db.collection('actions', function(err, collection) {
            if(!nextAction.actionid) {
                cb();
                return;
            }
            collection.findOne({_id:new ObjectID(nextAction.actionid)}, {}, function(err, action) {
                if(action == null){
                    cb();
                    return;
                }
                for(var iTCParamCount=0;iTCParamCount<lastPoint.dbAction.parameters.length;iTCParamCount++){
                    for(var iActionParamCount=0;iActionParamCount<action.params.length;iActionParamCount++){
                        if(action.params[iActionParamCount].id == lastPoint.dbAction.parameters[iTCParamCount].paramid){
                            lastPoint.dbAction.parameters[iTCParamCount].paramname = action.params[iActionParamCount].name;
                            lastPoint.dbAction.parameters[iTCParamCount].parametertype = action.params[iActionParamCount].parametertype;
                            break;
                        }
                    }
                }
                lastPoint.name = action.name;
                lastResultPoint.name = action.name;
                lastResultPoint.actionStatus = action.status;
                if (action.status != "Automated"){
                    if (executions[executionID] && executions[executionID].ignoreStatus != true){
                        testcaseDetails.statusError = "One ore more actions inside the test case are not in automated state.";
                        lastResultPoint.error = "Action " + action.status;
                    }
                }
                lastResultPoint.expanded = false;
                if (action.type == "script")
                {
                    var lang = "Java/Groovy";
                    if(action.scriptLang){
                        lang = action.scriptLang;
                    }
                    lastPoint.script = action.script;
                    lastPoint.scriptLang = lang;
                    lastPoint.type = action.type;
                    lastResultPoint.script = action.script;
                    lastResultPoint.scriptLang = lang;
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

    deleteOldResult(executions[executionID].testcases[testcaseID].resultID,executionID,function(){
        db.collection('testcases', function(err, collection) {
            collection.findOne({_id:new ObjectID(dbID)}, {}, function(err, testcase) {
                if(testcase == null) {
                    callback(null);
                    return;
                }
                if (testcase.type == "script" ||testcase.type == "junit"||testcase.type == "testng"){
                    var lang = "Java/Groovy";
                    if(testcase.scriptLang){
                        lang = testcase.scriptLang;
                    }
                    testcaseDetails = {type:testcase.type,dbTestCase:testcase,scriptLang:lang,script:testcase.script,afterState:false,name:testcase.name};
                    testcaseResults = {name:testcase.name,testcaseID:testcase._id,script:testcase.script,leaf:true};
                    callback(testcaseDetails,testcaseResults,["Default"]);
                }
                else{
                    //now process after state
                    var afterStatePresent = false;
                    if((testcase.afterState) && (testcase.afterState != "") &&(executions[executionID].ignoreAfterState == false)){
                        var stateOrder = (testcase.collection.length+1);
                        if(Array.isArray(testcase.afterState)){
                            if(testcase.afterState.length > 0){
                                afterStatePresent = true;
                            }
                            testcase.afterState.forEach(function(afterStateAction,index){
                                var afterStateActionOrder = stateOrder+index;
                                afterStateAction.order = afterStateActionOrder.toString();
                                afterStateAction.afterState = true;
                                testcase.collection.push(afterStateAction);
                            })
                        }
                        else{
                            afterStatePresent = true;
                            testcase.collection.push({order:stateOrder.toString(),host:"Default",actionid:testcase.afterState,parameters:[],executionflow:"Record Error Stop Test Case",afterState:true});
                        }
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

                            if(!executions[executionID] || !executions[executionID].testcases[testcaseID]){
                                return;
                            }
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
                    if((settings == null) || (!settings.host) || (settings.host == "")) return;
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
                            common.logger.info(error);
                        }

                        smtpTransport.close();
                    });
                });
            });
        })
    });
}


exports.copyFiles = function(sourceDir,destDir,callback){copyFiles(sourceDir,destDir,callback)};
function copyFiles(sourceDir,destDir,callback){
    fs.exists(sourceDir,function(exists){
        if(exists == true){
            fs.mkdir(destDir,function(){
                fs.readdir(sourceDir,function(err,files){
                    var copied = 1;
                    files.forEach(function(file,index){
                        try{
                            fs.stat(sourceDir + '/' + file,function(err,stat){
                                if(!stat.isDirectory()){
                                    copyFile(sourceDir + '/' + file,destDir + '/' + file,function(){
                                        if (sourceDir + '/' + file in fileSync){
                                            if(fileSync[sourceDir + '/' + file].close){
                                                fileSync[sourceDir + '/' + file].destroy();
                                                fileSync[destDir + '/' + file].destroy();
                                                delete fileSync[destDir + '/' + file];
                                                delete fileSync[sourceDir + '/' + file];
                                            }
                                        }
                                        if(copied == files.length) callback();
                                        copied++;
                                    });
                                }
                                else{
                                    if(copied == files.length) callback();
                                    copied++;
                                }
                            });
                            //fs.createReadStream(sourceDir + '/' + file).pipe(fs.createWriteStream(destDir + '/' + file));
                        }
                        catch(err){
                            callback(err)
                        }
                    });
                });
            })
        }
        else{
            callback("Source Dir: "+sourceDir +" does not exist.")
        }
    });
}

function copyFile(source, target, cb) {
    var cbCalled = false;
    if (source in fileSync){
        if(fileSync[source].close){
            fileSync[source].destroy();
        }
    }
    else if (target in fileSync){
        if(fileSync[target].close){
            fileSync[target].destroy();
        }
    }
    else{
        fileSync[source] = true;
    }

    var rd = fs.createReadStream(source);
    fileSync[source] = rd;
    var wr = fs.createWriteStream(target);
    fileSync[target] = wr;

    wr.on("error", function(err) {
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
        this.close();
        rd.destroy.bind(rd);
        done(err);
    });
    wr.on("close", function(ex) {
        done();
        if(rd.destroy){
            rd.destroy.bind(rd);
        }
    });

    rd.on("close",function(){
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
            fileSync[target].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
    });

    rd.on("error",function(e){
        if(source in fileSync && fileSync[source].close){
            fileSync[source].destroy();
            fileSync[target].destroy();
        }
        delete fileSync[source];
        delete fileSync[target];
        //this.end();
        done(e);
    }).pipe(wr, { end: true });


    function done(err) {
        if(fileSync[source]) {fileSync[source].destroy();delete fileSync[source]}
        if(fileSync[target]) {fileSync[target].destroy();delete fileSync[target]}
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}

exports.deleteDir = function(path,callback){deleteDir(path,callback)};
function deleteDir(path,callback){
    fs.exists(path,function(exists){
        if(exists == true){
            fs.readdir(path,function(err,files){
                files.forEach(function(file){
                    file = path + '/' + file;
                    try{
                        fs.unlinkSync(file);
                    }
                    catch(err){

                    }
                });
                fs.rmdir(path,function(){
                    if (callback) callback();
                });
            })
        }
        else{
            if (callback) callback();
        }
    })
}

