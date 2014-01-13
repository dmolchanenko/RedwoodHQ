var realtime = require('./realtime');
var http = require("http");
var path = require('path');
var fs = require('fs');
var realtime = require("./realtime");


exports.record = function(req, res){
    var data = req.body;
    var project = req.cookies.project;
    var username = req.cookies.username;
    var ip = req.connection.remoteAddress;

    res.contentType('json');
    res.json({
        success: true
    });

    console.log(ip);
    var options = {
        hostname: ip,
        port: 5009,
        path: '/startrecording',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var request = http.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
        });
    });

    request.on('error', function(e) {
        console.log('recordImage problem with request: ' + e.message);
        if (callback) callback("Unable to connect to machine: "+ip + " error: " + e.message);
    });

    // write data to request body
    request.write(JSON.stringify({project:project,username:username,type:data.type,browser:data.browser,url:data.url}));
    request.end();

};

exports.recorded = function(req, res){
    var data = req.body;
    var db = require('../common').getDB();
    res.contentType('json');
    var recording = JSON.parse(data.recording);
    res.json({
        success: true
    });

    if(data.type == "testcase"){
        db.collection('actions', function(err, collection) {
            collection.findOne({name:"Click",project:data.project}, {}, function(err, click) {
                collection.findOne({name:"Type",project:data.project}, {}, function(err, type) {
                    collection.findOne({name:"Select",project:data.project}, {}, function(err, select) {
                        var result = [];
                        recording.forEach(function(record,index){
                            var order = index + 1;
                            var action;
                            if(record.operation == "click"){
                                order = order.toString();
                                action = {actionid:click._id.toString(),actionname:"Click",executionflow:"Record Error Stop Test Case",host: "Default",order: order,children:[]};
                                for (var i=0; i<click.params.length; i++){
                                    if(click.params[i].name == "ID"){
                                        action.children.push({parametertype: click.params[i].parametertype,paramid: click.params[i].id,paramname: "ID",paramvalue: record.id,leaf:true});
                                    }
                                    else {
                                        action.children.push({parametertype: click.params[i].parametertype,paramid: click.params[i].id,paramname: "ID",paramvalue: "XPath",leaf:true});
                                    }

                                }
                                result.push(action)
                            }else if(record.operation == "sendKeys"){
                                order = order.toString();
                                action = {actionid:type._id.toString(),actionname:"Type",executionflow:"Record Error Stop Test Case",host: "Default",order: order,children:[]};
                                for (var i=0; i<type.params.length; i++){
                                    if(click.params[i].name == "ID"){
                                        action.children.push({parametertype: click.params[i].parametertype,paramid: click.params[i].id,paramname: "ID",paramvalue: record.id,leaf:true});
                                    }
                                    else {
                                        action.children.push({parametertype: click.params[i].parametertype,paramid: click.params[i].id,paramname: "ID",paramvalue: "XPath",leaf:true});
                                    }

                                }
                                result.push(action)
                            }
                            if(index+1 == recording.length){
                                realtime.emitMessage("StepsRecorded"+data.username,result);
                            }
                        });
                    });
                });
            });
        });
    }
    /*
    var tmp_path = req.files.file.path;
    var db = require('../common').getDB();
    //var target_path = path.resolve(__dirname,"../public/automationscripts/"+req.cookies.project+"/"+req.cookies.username+"/Images/"+req.files.file.name);
    //console.log(target_path);
    fs.readFile(tmp_path,function(err,data){
        if(!err){
            db.collection('images', function(err, collection) {
                collection.save({file:new MongoDB.Binary(data),tolerance:"0.7",offset:{x:0,y:0},temp:true,project:req.cookies.project}, {safe:true},function(err,returnData){
                    realtime.emitMessage("ImageRecorded"+req.cookies.username,returnData);
                    fs.unlink(tmp_path);
                    res.contentType('json');
                    res.json({
                        success: true
                    });
                });
            });
        }
    });
    */
};