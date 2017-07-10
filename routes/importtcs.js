var fs = require('fs');
var path = require('path');
var elasticsearch = require('./elasticsearch');
var common = require('../common');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var appDir = path.resolve(__dirname,"../")+"/";
var spawn = require('child_process').spawn;
var walk = require('walk');
var realtime = require("./realtime");
var divideChar = "\r\n";

if(process.platform == "win32"){
    divideChar = "\r\n";
}
else{
    divideChar = "\n";
}


exports.importAllTCs = function(req,res){

    var walker = walk.walk(rootDir+req.cookies.project+"/"+req.cookies.username+"/src");

    var total = 0;
    var processed = 0;
    var totalTCs = 0;
    walker.on("file", function (root, fileStats, next) {
        total++;
        next();
        importTCsFromFile(root+"/"+fileStats.name,req.cookies.project,function(totalImported){
            processed++;
            totalTCs = totalTCs + totalImported;
            if(total == processed){
                realtime.emitMessage("TCImportDone"+req.cookies.username,totalTCs);
            }
        });
    });

    walker.on("end",function(){
        if(total == 0){
            realtime.emitMessage("TCImportDone"+req.cookies.username,totalTCs);
        }
    });
    res.contentType('json');
    res.json({success: true});
};

exports.getAllPythonTests = function(req,res){
    res.contentType('json');
    res.json({success: true});
    var pythonPath = "";
    if(process.platform == "win32"){
        pythonPath = rootDir+req.cookies.project+"/"+req.cookies.username+"/PythonWorkDir/python"
    }
    else{
        pythonPath = rootDir+req.cookies.project+"/"+req.cookies.username+"/PythonWorkDir/bin/python"
    }
    scanPythonFiles(pythonPath,rootDir+req.cookies.project+"/"+req.cookies.username+"/src",function(tests){
        if(tests == ""){
            realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:[],import:req.body.import});
            return;
        }
        var TCs = tests.split("\n");
        var allTCs = [];
        var tcCount = 0;
        TCs.forEach(function(testCaseData,index) {
            var testCase = testCaseData.split("|")[0];
            var tags = testCaseData.split("|");
            tags.shift();
            if(testCase != ""){
                var db = require('../common').getDB();
                db.collection('testcases', function(err, collection) {
                    collection.findOne({type: { $in: [ 'pytest'] }, script: testCase, project: req.cookies.project}, function (err, data) {
                        if (data === null) {
                            allTCs.push({name:testCase,path:testCase,type:"pytest",scriptLang:"Python",tags:tags});
                        }
                        tcCount++;
                        if (tcCount == TCs.length) {
                            realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                        }
                    });
                });

            }
            else{
                tcCount++;
                if (tcCount == TCs.length) {
                    realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                }
            }
        });
        //realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
    })
};

exports.getAllUnitTests = function(req,res){
    res.contentType('json');
    res.json({success: true});
    var walker = null;
    var total = 0;
    var processed = 0;
    var allTCs = [];

    var processFile = function(path){
        scanFile(path,function(cache){
            if(cache.indexOf("JUNIT") != -1 || cache.indexOf("TESTNG") != -1 ) {
                var TCs = cache.split(divideChar);
                var tcCount = 0;
                TCs.forEach(function(testCase,index) {
                    if (index != 0 && testCase != "") {
                        if(req.body.import === true){
                            var db = require('../common').getDB();
                            db.collection('testcases', function(err, collection) {
                                collection.findOne({type: { $in: [ 'junit', 'testng' ] }, script: testCase.split("|")[0], project: req.cookies.project}, function (err, data) {
                                    if (data === null) {
                                        allTCs.push({name:testCase.split("|")[0],path:path,type:TCs[0]});
                                    }

                                    tcCount++;
                                    if (tcCount == TCs.length) {
                                        processed++;
                                        if (total == processed) {
                                            realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                                        }
                                    }
                                });
                            });
                        }
                        else{
                            allTCs.push({name:testCase.split("|")[0],path:path,type:TCs[0]});
                            tcCount++;
                            if (tcCount == TCs.length) {
                                processed++;
                                if (total == processed) {
                                    realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                                }
                            }
                        }
                    }
                    else{
                        tcCount++;
                        if (tcCount == TCs.length) {
                            processed++;
                            if (total == processed) {
                                realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                            }
                        }
                    }
                });
                if (total == processed && TCs.length == 0) {
                    realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                }
            }
            else{
                processed++;
                if (total == processed) {
                    realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
                }
            }
        });
    };

    if(req.body.path){
        total = 1;
        processFile(req.body.path)
    }
    else{
        walker = walk.walk(rootDir+req.cookies.project+"/"+req.cookies.username+"/src");
        walker.on("file", function (root, fileStats, next) {
            total++;
            next();
            processFile(root+"/"+fileStats.name);
            //console.log(root+"/"+fileStats.name);

        });

        walker.on("end",function(){
            if(total == 0){
                realtime.emitMessage("GetAllTestCases"+req.cookies.username,{testcases:allTCs,import:req.body.import});
            }
        });
    }

};


function importTCsFromFile(path,project,callback){
    scanFile(path,function(cache){
        if(cache.indexOf("JUNIT") != -1 || cache.indexOf("TESTNG") != -1 ){
            var TCs = cache.split(divideChar);
            var db = require('../common').getDB();
            var tcType = "";
            if (TCs[0] == "JUNIT"){
                tcType = "junit"
            }
            else{
                tcType = "testng"
            }
            var tcCount = 0;
            var totalImported = 0;
            TCs.forEach(function(testCase,index){
                if(index != 0 && testCase != ""){
                    var tcDetails = testCase.split("|");
                    db.collection('testcases', function(err, collection) {
                        collection.findOne({type:{ $in: [ 'junit', 'testng' ] },script:tcDetails[0],project:project},function(err,data){
                            if(data == null){
                                insertTC(tcDetails[0],project,tcType,function(){
                                    totalImported++;
                                    tcCount++;
                                    if(tcCount == TCs.length){callback(totalImported)}
                                })
                            }
                            else{
                                tcCount++;
                                if(tcCount == TCs.length){callback(totalImported)}
                            }
                        });
                    });
                }
                else{
                    tcCount++;
                    if(tcCount == TCs.length){callback(totalImported)}
                }
            });
        }
        else{
            callback(0);
        }
    })
}

exports.importSelectedTCs = function(req,res){
    var count = 0;
    var tags = [];
    req.body.testcases.forEach(function(testcase){
        var packages = "";
        var tcTags = [];
        if(testcase.type == "pytest") {
            tcTags = testcase.tags;
            for(var i2=0;i2<testcase.tags.length;i2++){
                if(tags.indexOf(testcase.tags[i2]) == -1) tags.push(testcase.tags[i2]);
            }
        }
        else{
            packages = testcase.name.split(".");
            for(var i=0;i<packages.length;i++){
                if(i<packages.length-2){
                    if(tags.indexOf(packages[i]) == -1) tags.push(packages[i]);
                    tcTags.push(packages[i]);
                }
            }
        }
        insertTC(testcase.name,req.cookies.project,testcase.type.toLowerCase(),tcTags,function(){
            count++;
            if(count == req.body.testcases.length){
                insertTags(tags,req.cookies.project,function(){
                    realtime.emitMessage("TCImportDone"+req.cookies.username,count);
                });
            }
        })
    });
    res.contentType('json');
    res.json({success: true});
};

function insertTC(fullName,project,tcType,tags,callback){
    var language = "Java/Groovy";
    if(tcType == "pytest"){
        language = "Python";
    }
    var db = require('../common').getDB();
    var newTC = {scriptLang:language,name:fullName,type:tcType,script:fullName,status:"Automated",tag:tags,project:project,actioncollection:[]};
    db.collection('testcases', function(err, collection) {
        collection.insert(newTC, {safe:true},function(err,tcReturnData){
            if(err == null){
                realtime.emitMessage("AddTestCases",tcReturnData[0]);
                elasticsearch.indexTestCase(tcReturnData[0],"PUT");
            }
            callback()
        });
    });
}

function insertTags(tags,project,callback){
    if(tags.length == 0) callback();
    var db = require('../common').getDB();
    var tagCount = 0;
    tags.forEach(function(tag,index){
        db.collection('testcaseTags', function(err, tagcollection) {
            tagcollection.findOne({project:project,value:tag},{},function(err,foundTag){
                if (foundTag == null){
                    tagcollection.insert({project:project,value:tag}, {safe:true},function(err,returnData){
                        realtime.emitMessage("AddTestCaseTags",returnData[0]);
                        tagCount++;
                        if (tagCount == tags.length){
                            callback();
                        }
                    });
                }
                else{
                    tagCount++;
                    if (tagCount == tags.length){
                        callback();
                    }
                }

            });
        });
    });
}

function scanFile(path,callback){
    var proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"MethodList",path,"tests"]);
    proc.stderr.on('data', function (data) {
        common.logger.error(data.toString());
    });
    var cache = "";
    proc.stdout.on('data', function(data) {
        cache = cache + data.toString();
    });
    proc.on('close', function(){
        callback(cache)
    });
}

function scanPythonFiles(pythonPath,path,callback){
    //var proc = spawn(pythonPath,[appDir+'utils/pytestparser.py'],{cwd:path,env:{PYTHONDONTWRITEBYTECODE:"true"}});
    var proc = spawn(pythonPath,[appDir+'utils/pytestparser.py'],{cwd:path+"/",env:{PYTHONPATH:path+"/",PYTHONDONTWRITEBYTECODE:"true"}});
    proc.stderr.on('data', function (data) {
        common.logger.error(data.toString());
    });
    var cache = "";
    proc.stdout.on('data', function(data) {
        cache = cache + data.toString();
    });
    proc.on('close', function(){
        callback(cache)
    });
}