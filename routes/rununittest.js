var execEngine = require('./executionengine');
var git = require('../gitinterface/gitcommands');
var path = require('path');
var realtime = require("./realtime");
var runningTests = {};
var os = require('os');

exports.runUnitTest = function(req,res){
    var testCaseInfo = req.body.testcase;
    var project = req.cookies.project;
    var username = req.cookies.username;
    var ip = req.connection.remoteAddress;
    var port = 5009;

    execEngine.compileBuild(project,username,function(result){
        console.log(result);
        if (result != null){
            res.contentType('json');
            res.json({error:"Unable to compile scripts."});
        }
        else{
            res.contentType('json');
            res.json({success:true});
            execEngine.deleteDir(os.tmpdir()+"/jar_"+username+"unittest",function(){
                git.copyFiles(path.join(__dirname, '../public/automationscripts/'+project+"/"+username+"/build"),"jar",os.tmpdir()+"/jar_"+username+"unittest",function(){
                    execEngine.cacheSourceCode(path.join(__dirname, '../public/automationscripts/'+project+"/"+username),function(sourceCache){
                        execEngine.agentBaseState(project+"/"+username,username+"unittest",ip,port,99,function(message){
                            if(message && message.error){
                                realtime.emitMessage("UnitTestStop"+username,{error:"Please download agent to run unit tests locally."});
                                return;
                            }
                            runningTests[username] = {sourceCache:sourceCache};
                            var command = {username:username,command:"run action",ignoreScreenshots:true,allScreenshots:false,parameters:[],runType:"unittest",executionID:username+"unittest",script:testCaseInfo.name,type:testCaseInfo.type.toLowerCase(), threadID:99};
                            execEngine.sendAgentCommand(ip,port,command,3);
                        })
                    })
                });
            });
        }
    })

};

exports.stopUnitTest = function(req,res){
    var ip = req.connection.remoteAddress;
    var username = req.cookies.username;
    var port = 5009;
    execEngine.sendAgentCommand(ip,port,{command:"cleanup",executionID:username+"unittest"},3);
    res.contentType('json');
    res.json({success:true});
};

exports.unitTestResult = function(req,res){
    res.contentType('json');
    res.json({success:true});
    var username = req.body.username;
    realtime.emitMessage("UnitTestStop"+req.body.username,{});
    if(req.body.trace){
        realtime.emitMessage("UnitTestRun"+username,{status:'<span style="color: red; ">Test Failed:</span>'});
        realtime.emitMessage("UnitTestRun"+username,{error:req.body.error});
        execEngine.formatTrace(req.body.trace,runningTests[username].sourceCache,function(trace){
            realtime.emitMessage("UnitTestRun"+username,{message:trace});
        });
    }
    else{
        realtime.emitMessage("UnitTestRun"+username,{status:'<span style="color: green; ">Test Passed</span>'});
    }
    delete runningTests[req.body.username];
};

exports.unitTestLog = function(req,res){
    res.contentType('json');
    res.json({success:true});
    realtime.emitMessage("UnitTestRun"+req.body.username,{message:req.body.message});
};