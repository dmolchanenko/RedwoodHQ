
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , variables = require('./routes/variables')
  , variableTags = require('./routes/variableTags')
  , machines = require('./routes/machines')
  , machinetags = require('./routes/machineTags')
  , machineroles = require('./routes/machineRoles')
  , common = require('./common');

var app = module.exports = express.createServer();
common.initDB();
// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
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

app.get('/', routes.index);
//variables
app.get('/variables', variables.variablesGet);
app.put('/variables/:id', variables.variablesPut);
app.post('/variables', variables.variablesPost);
app.del('/variables/:id', variables.variablesDelete);

//variableTags
app.get('/variableTags', variableTags.variableTagsGet);
app.post('/variableTags', variableTags.variableTagsPost);

//machines
app.get('/machines', machines.machinesGet);
app.put('/machines/:id', machines.machinesPut);
app.post('/machines', machines.machinesPost);
app.del('/machines/:id', machines.machinesDelete);
//machineTags
app.get('/machinetags', machinetags.machineTagsGet);
app.post('/machinetags', machinetags.machineTagsPost);
//machineRoles
app.get('/machineroles', machineroles.machineRolesGet);
app.post('/machineroles', machineroles.machineRolesPost);


app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


