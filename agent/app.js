var express = require('express');
var command = require('./routes/command');
var imageautomation = require('./routes/imageautomation');
var recorder = require('./routes/recorder');
var fileupload = require('./routes/fileupload');
var uploadfiles = require('./routes/uploadfiles');
var heartbeat = require('./routes/heartbeat');
var update = require('./routes/update');
var common = require('./common');

var app = express();

app.configure(function(){
    //app.use(express.logger());
    //app.use(express.errorHandler());
    app.use(express.bodyParser());
    //app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(app.router);
    //app.use(express.bodyParser({ keepExtensions: true, uploadDir: '/bin' }));
});

app.post('/command',command.Post);
app.post('/update',update.Post);
app.post('/fileupload',fileupload.Post);
app.post('/uploadfiles',uploadfiles.uploadFiles);
app.post('/recordimage',imageautomation.recordImage);
app.post('/startrecording',recorder.record);

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});
common.initLogger("agent");
common.parseConfig(function(){
    app.listen(common.Config.AgentPort, function(){
        if(common.Config.CloudAgent !== "true"){
            heartbeat.startHeartBeat(common.Config.AppServerIPHost,common.Config.AppServerPort,common.Config.AgentPort,common.Config.AgentVNCPort,common.Config.AgentVersion,common.Config.OS);
        }
        command.cleanUp();
        //console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
    });
});




