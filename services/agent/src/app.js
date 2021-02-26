var express = require('express');
var command = require('./routes/command');
var imageautomation = require('./routes/imageautomation');
var recorder = require('./routes/recorder');
var fileupload = require('./routes/fileupload');
var uploadfiles = require('./routes/uploadfiles');
var heartbeat = require('./routes/heartbeat');
var update = require('./routes/update');
var common = require('./common');
var path = require('path');
var fs = require('fs');
var idesync = require('./routes/idesync');

var realFs = require("fs");
var gracefulFs = require("graceful-fs");
gracefulFs.gracefulify(realFs);

//disable console output for linux to avoid crashes
if(process.platform != "win32") {
    console.log = function(){};
    console.info = function(){};
    console.error = function(){};
    console.warn = function(){};
}

fs.writeFileSync(__dirname+"/agent.pid",process.pid);


process.setMaxListeners(0);
require('events').EventEmitter.defaultMaxListeners = 100;

var app = express();
process.env.TMPDIR = path.resolve(__dirname,"../logs");
process.env.TMP = path.resolve(__dirname,"../logs");
process.env.TEMP = path.resolve(__dirname,"../logs");

app.configure(function(){
    //app.use(express.logger());
    //app.use(express.errorHandler());
    app.use(express.bodyParser());
    //app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.timeout(300000));
    //app.use(express.bodyParser({ keepExtensions: true, uploadDir: '/bin' }));
});

app.post('/command',command.Post);
app.post('/update',update.Post);
app.post('/fileupload',fileupload.Post);
app.post('/matchfile',fileupload.MatchFile);
app.post('/uploadfiles',uploadfiles.uploadFiles);
app.post('/recordimage',imageautomation.recordImage);
app.post('/startrecording',recorder.record);
app.post('/idesync',idesync.syncToRedwoodHQ);

require("fs").writeFileSync(__dirname+"/app.pid",process.pid);

app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
app.use(express.errorHandler());
common.initLogger("agent");
common.parseConfig(function(){
    app.listen(common.Config.AgentPort, function(){
        if(common.Config.CloudAgent !== "true"){
            heartbeat.startHeartBeat(common.Config.AppServerIPHost,common.Config.AppServerPort,common.Config.AgentPort,common.Config.AgentVNCPort,common.Config.AgentVersion,common.Config.OS);
        }
        common.logger.info('Agent Started.');
        command.cleanUp();
        //console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
    });
});




