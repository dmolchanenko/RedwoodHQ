
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , variables = require('./routes/variables')
  , scripts = require('./routes/scripts')
  , folder = require('./routes/folder')
  , script = require('./routes/script')
  , users = require('./routes/users')
  , variableTags = require('./routes/variableTags')
  , userTags = require('./routes/userTags')
  , machines = require('./routes/machines')
  , machinetags = require('./routes/machineTags')
  , actions = require('./routes/actions')
  , actiontags = require('./routes/actionTags')
  , machineroles = require('./routes/machineRoles')
  , fileupload = require('./routes/fileupload')
  , common = require('./common')
  , auth = require('./routes/auth')
  , terminal = require('./routes/terminal')
  , compile = require('./routes/compile')
  , sio = require('socket.io') ;


var app = module.exports = express.createServer(
    //express.bodyParser(),
    //express.cookieParser(),
    //express.session({ secret: 'redwoodsecrect' })
);
var io = sio.listen(app);
common.initDB();
// Configuration

app.configure(function(){
    //app.use(express.logger());
    //app.use(express.errorHandler());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});
//DB


// Routes
app.post('/login',auth.logIn,auth.logInSucess);
app.get('/login',auth.loginPage);

app.get('/',auth.auth, routes.index);
app.get('/index.html',auth.auth,function(req,res){res.sendfile('index.html');});
//variables
app.get('/variables', auth.auth, variables.variablesGet);
app.put('/variables/:id',auth.auth, variables.variablesPut);
app.post('/variables',auth.auth, variables.variablesPost);
app.del('/variables/:id',auth.auth, variables.variablesDelete);

//variableTags
app.get('/variableTags',auth.auth, variableTags.variableTagsGet);
app.post('/variableTags',auth.auth, variableTags.variableTagsPost);

//machines
app.get('/machines',auth.auth, machines.machinesGet);
app.put('/machines/:id',auth.auth, machines.machinesPut);
app.post('/machines',auth.auth, machines.machinesPost);
app.del('/machines/:id',auth.auth, machines.machinesDelete);
//machineTags
app.get('/machinetags',auth.auth, machinetags.machineTagsGet);
app.post('/machinetags',auth.auth, machinetags.machineTagsPost);

//actions
app.get('/actions',auth.auth, actions.actionsGet);
app.put('/actions/:id',auth.auth, actions.actionsPut);
app.post('/actions',auth.auth, actions.actionsPost);
app.del('/actions/:id',auth.auth, actions.actionsDelete);
//actionTags
app.get('/actiontags',auth.auth, actiontags.actionTagsGet);
app.post('/actiontags',auth.auth, actiontags.actionTagsPost);

//machineRoles
app.get('/machineroles',auth.auth, machineroles.machineRolesGet);
app.post('/machineroles',auth.auth, machineroles.machineRolesPost);

//users
app.get('/users', auth.auth, users.usersGet);
app.put('/users/:id',auth.auth, users.usersPut);
app.post('/users',auth.auth, users.usersPost);
app.del('/users/:id',auth.auth, users.usersDelete);

//userTags
app.get('/userTags',auth.auth, userTags.userTagsGet);
app.post('/userTags',auth.auth, userTags.userTagsPost);

//scripts
app.get('/scripts/root',auth.auth, scripts.scriptsGet);
app.delete('/scripts/:id',auth.auth, scripts.scriptsDelete);
app.post('/scripts/copy',auth.auth, scripts.scriptsCopy);

//script
app.post('/script/get',auth.auth, script.scriptGet);
app.post('/script',auth.auth, script.scriptPost);
app.put('/script',auth.auth, script.scriptPut);

//folder
app.post('/folder',auth.auth, folder.folderPost);
app.put('/folder',auth.auth, folder.folderPut);

//folder
app.post('/fileupload',auth.auth, fileupload.upload);


io.configure( function() {
    io.set('log level', 0);
});

io.sockets.on('connection', function(socket) {
    console.log(socket.id);
    socket.on("terminal",function(msg){
        terminal.operation(msg,socket.id,function(response){
            io.sockets.socket(socket.id).emit("terminal",response);
        })
    });
    socket.on("compile",function(msg){
        compile.operation(msg,socket.id,function(response){
            console.log(response);
            io.sockets.socket(socket.id).emit("compile",response);
        })
    });
    socket.on('disconnect', function () {
        terminal.closeSession(socket.id);
    });
});


app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
