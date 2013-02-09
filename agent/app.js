var express = require('express');
var command = require('./routes/command');
var fileupload = require('./routes/fileupload');
var heartbeat = require('./routes/heartbeat');
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
app.post('/fileupload',fileupload.Post);

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

common.parseConfig(function(){
    app.listen(common.Config.AgentPort, function(){
        heartbeat.startHeartBeat(common.Config.AppServerIPHost,common.Config.AppServerPort,common.Config.AgentPort,common.Config.AgentVNCPort);
        //console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
    });
});




