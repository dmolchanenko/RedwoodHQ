var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var baseDir = path.resolve(__dirname,"../");
var common = require('../common');
var http = require("http");

exports.record = function(req, res){
    var data = req.body;
    res.contentType('json');
    res.json({
        success: true
    });

    var javaPath;
    if(require('os').platform() == "linux"){
        javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java";
    }
    else{
        javaPath = path.resolve(__dirname,"../../vendor/Java/bin")+"/java"
    }

    //console.log(javaPath+" -Xmx512m -Djava.library.path="+baseDir+"\\lib -jar ImageAutomation.jar temp.png");
    var recordProc = spawn(javaPath,["-Xmx512m","-cp","../LookingGlass.jar;../lib/*","com.primatest.ui.MainWindow",req.body.browser,req.body.url],{env:{PATH:baseDir+"\\lib"},cwd:baseDir+"\\lib"});
    //var recordProc = spawn(javaPath,["-Xmx512m","-jar","../LookingGlass.jar",req.body.browser,req.body.url],{env:{PATH:baseDir+"\\lib"},cwd:baseDir+"\\lib"});

    var cmdCache = "";
    recordProc.stderr.on('data', function (data) {
        //common.logger.error("error recording: "+data.toString());
        //sendRecordingResult({error:data.toString()},common.Config.AppServerIPHost,common.Config.AppServerPort);
    });

    recordProc.stdout.on('data', function (data) {
        common.logger.error(data.toString());
        cmdCache += data.toString();
    });

    recordProc.on('close', function (code) {
        data.recording = cmdCache;
        //sendRecordingResult(data,common.Config.AppServerIPHost,common.Config.AppServerPort);
    });

};

function sendRecordingResult(result,host,port){
    var options = {
        hostname: host,
        port: port,
        path: '/record/recorded',
        method: 'POST',
        agent:false,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            common.logger.info('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        common.logger.error('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(result));
    //req.write(result);
    req.end();
}
