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

    res.contentType('json');
    res.json({success:true});

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
    executions[executionID] = {testcases:testcases,machines:machines,variables:variables,currentTestCases:{}};
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
            agentBaseState(req.cookies.project,"localhost",function(){
                GetTestCaseDetails(testcases[0].testcaseID,function(testcase,result,hosts){
                    var agentInstructions = {command:"run action",executionID:executionID,testcaseID:testcase.dbTestCase._id};

                    result.executionID = executionID;
                    //result.testcaseName = testcase.dbTestCase.name;
                    executions[executionID].currentTestCases[testcase.dbTestCase._id] = {testcase:testcase,result:result};
                    createResult(result,function(writtenResult){
                        result._id = writtenResult._id;
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
                        sendAgentCommand("localhost",agentInstructions)
                    });
                })
            });
        }
    });
};

exports.actionresultPost = function(req, res){
    var execution = executions[req.body.executionID];
    var testcase = execution.currentTestCases[req.body.testcaseID];


};


function agentBaseState(project,agentHost,callback){
    sendAgentCommand(agentHost,{command:"cleanup"},function(){
        syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/bin"),"bin",function(){
            syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/External Libraries"),"lib",function(){
                syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/build/jar"),"lib",function(){
                    syncFilesWithAgent(agentHost,path.join(__dirname, '../public/automationscripts/'+project+"/launcher"),"launcher",function(){
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
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function lockMachines(machines,callback){
    var machineCount = 0;
    machines.forEach(function(machine){
        machine.state = "Running Test";
        db.collection('machines', function(err, collection) {
            collection.save(machine,{safe:true},function(err){
                machineCount++;
                if (machineCount == machines.length){
                    if (callback) callback();
                }
            });
        });
    });
}


function findNextAction (actions,variables,callback){
    var order = 1;
    actions.sort(function(a, b){
        return parseInt(a.dbAction.order)-parseInt(b.dbAction.order);
    });
    actions.forEach(function(action){
        if(action.dbAction.order == order.toString()){
            if (action.status == "Finished"){
                if (order == actions.length){
                    callback(null);
                }
                order++;
                return;
            }
            if (action.script){
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
                callback(action);
            }
            else{
                findNextAction(action.actions,variables,function(action){
                    if ((action == null) &&(order == actions.length)){
                        callback(null)
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
                        callback(action)
                    }
                });
            }
        }
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

