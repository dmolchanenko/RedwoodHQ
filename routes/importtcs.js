var fs = require('fs');
var path = require('path');
var common = require('../common');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var appDir = path.resolve(__dirname,"../")+"/";
var spawn = require('child_process').spawn;
var walk = require('walk');
var realtime = require("./realtime");


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
                var TCs = cache.split("\r\n");
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
            var TCs = cache.split("\r\n");
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
    req.body.testcases.forEach(function(testcase){
        insertTC(testcase.name,req.cookies.project,testcase.type.toLowerCase(),function(){
            count++;
            if(count == req.body.testcases.length){
                realtime.emitMessage("TCImportDone"+req.cookies.username,count);
            }
        })
    });
    res.contentType('json');
    res.json({success: true});
};

function insertTC(fullName,project,tcType,callback){
    var tags = [];
    var db = require('../common').getDB();
    var packages = fullName.split(".");
    for(var i=0;i<packages.length;i++){
        if(i<packages.length-2){
            tags.push(packages[i]);
        }
    }
    var insertTC = function(){
        var newTC = {name:fullName,type:tcType,script:fullName,status:"Automated",tag:tags,project:project,actioncollection:[]};
        db.collection('testcases', function(err, collection) {
            collection.insert(newTC, {safe:true},function(err,tcReturnData){
                if(err == null){
                    realtime.emitMessage("AddTestCases",tcReturnData[0]);
                }
                callback()
            });
        });
    };
    var tagCount = 0;
    tags.forEach(function(tag,index){
        db.collection('testcaseTags', function(err, tagcollection) {
            tagcollection.findOne({project:project,value:tag},{},function(err,foundTag){
                if (foundTag == null){
                    tagcollection.insert({project:project,value:tag}, {safe:true},function(err,returnData){
                        realtime.emitMessage("AddTestCaseTags",returnData);
                        tagCount++;
                        if (tagCount == tags.length){
                            insertTC();
                        }
                    });
                }
                else{
                    tagCount++;
                    if (tagCount == tags.length){
                        insertTC();
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
        cache = cache + data;
    });
    proc.on('close', function(){
        callback(cache)
    });
}