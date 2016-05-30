
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
  , projects = require('./routes/projects')
  , variableTags = require('./routes/variableTags')
  , userTags = require('./routes/userTags')
  , userStates = require('./routes/userStates')
  , machines = require('./routes/machines')
  , machinetags = require('./routes/machineTags')
  , actions = require('./routes/actions')
  , actiontags = require('./routes/actionTags')
  , machineroles = require('./routes/machineRoles')
  , fileupload = require('./routes/fileupload')
  , common = require('./common')
  , auth = require('./routes/auth')
  , terminal = require('./routes/terminal')
  , realtime = require('./routes/realtime')
  , testsets = require('./routes/testsets')
  , hosts = require('./routes/hosts')
  , templates = require('./routes/templates')
  , uploadFiles = require('./routes/uploadfiles')
  , importtcs = require('./routes/importtcs')
  , rununittest = require('./routes/rununittest')
  , testcases = require('./routes/testcases')
  , testcaseTags = require('./routes/testcaseTags')
  , executions = require('./routes/executions')
  , executionTags = require('./routes/executionTags')
  , executiontestcases = require('./routes/executiontestcases')
  , executionengine = require('./routes/executionengine')
  , screenshots = require('./routes/screenshots')
  , heartbeat = require('./routes/heartbeat')
  , results = require('./routes/results')
  , methodFinder = require('./routes/methodFinder')
  , aggregate = require('./routes/aggregate')
  , executionstatus = require('./routes/executionStatus')
  , emailsettings = require('./routes/emailsettings')
  , imageautomation = require('./routes/imageautomation')
  , recorder = require('./routes/recorder')
  , license = require('./routes/license')
  , actionHistory = require('./routes/actionHistory')
  , versionControl = require('./routes/versionControl')
  , syncIDE = require('./routes/syncIDE')
  , testcaseHistory = require('./routes/testcaseHistory');

var realFs = require("fs");
var gracefulFs = require("graceful-fs");
gracefulFs.gracefulify(realFs);

//var app = express.createServer();
process.setMaxListeners(0);
require('events').EventEmitter.defaultMaxListeners = 100;
var app = express();
process.env.TMPDIR = __dirname + '/logs';
process.env.TMP = __dirname + '/logs';
process.env.TEMP = __dirname + '/logs';
// Configuration

//app.configure(function(){
    //app.use(express.bodyParser());
    //app.use(express.multipart());
    //app.use(express.bodyParser({ keepExtensions: true, uploadDir: 'c:/temp' }));
    app.use(express.static(__dirname + '/public'));
    //app.use(express.json());
    //app.use(express.urlencoded());
    app.use(express.json({limit: '50mb'}));
    app.use(express.urlencoded({limit: '50mb'}));
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(app.router);
    //app.use(express.static(__dirname + '/public'));
//});

//app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
//});

//app.configure('production', function(){
  app.use(express.errorHandler());
//});
//DB
require("fs").writeFileSync(__dirname+"/app.pid",process.pid);

// Routes
app.post('/login',auth.logIn,auth.logInSucess);
app.get('/login',auth.loginPage);

app.post('/license',auth.auth,license.licensePost);
app.get('/license',auth.auth,license.licenseGet);

//sync to IDE
app.post('/synctoide',auth.auth,syncIDE.syncToIDE);
app.post('/synctoredwoodhq',auth.auth,syncIDE.syncToRedwoodHQ);
app.post('/sourcesfromagent',syncIDE.sourcesFromAgent);

//versioncontrol
app.post('/versioncontrolhistory',auth.auth,versionControl.getLocalVersionHistory);
app.post('/versioncontrolhistory/diff',auth.auth,versionControl.getVersionDiff);

//emailsettings
app.post('/emailsettings',auth.auth,emailsettings.Post);
app.get('/emailsettings',auth.auth,emailsettings.Get);

//aggregate
app.post('/aggregate',auth.auth,aggregate.aggregatePost);

//imageautomation
app.post('/recordimage',auth.auth,imageautomation.recordImage);
app.get('/image/:id',auth.auth,imageautomation.getImage);
app.post('/recordedimage',imageautomation.recordedImage);

//test case history
app.get('/testcasehistory/:id',auth.auth,testcaseHistory.historyGet);
app.post('/testcasehistory',auth.auth,testcaseHistory.historyPost);

//action history
app.get('/actionhistory/:id',auth.auth,actionHistory.historyGet);
app.post('/actionhistory',auth.auth,actionHistory.historyPost);

//uploadFiles
app.post('/uploadfiles',auth.auth,uploadFiles.uploadFiles);
app.post('/uploadfromagent',uploadFiles.uploadFromAgent);
app.post('/uploadfilesdone',uploadFiles.uploadDone);

//importAllTCs
app.post('/importalltcs',importtcs.importAllTCs);
app.post('/getallunittcs',importtcs.getAllUnitTests);
app.post('/importselectedtcs',importtcs.importSelectedTCs);

//rununittest
app.post('/rununittest',rununittest.runUnitTest);
app.post('/rununittest/result',rununittest.unitTestResult);
app.post('/rununittest/log',rununittest.unitTestLog);
app.post('/stopunittest',rununittest.stopUnitTest);

//recorder
app.post('/record',auth.auth,recorder.record);
app.post('/record/recorded',recorder.recorded);

//screenshots
app.post('/screenshots',screenshots.Post);
app.get('/screenshots/:id',auth.auth,screenshots.Get);

app.get('/',auth.auth, routes.index);
app.get('/index.html',auth.auth,function(req,res){res.sendfile(__dirname+'/index.html');});
//variables
app.get('/variables', auth.auth, variables.variablesGet);
app.put('/variables/:id',auth.auth, variables.variablesPut);
app.post('/variables',auth.auth, variables.variablesPost);
app.del('/variables/:id',auth.auth, variables.variablesDelete);

//variableTags
app.get('/variableTags',auth.auth, variableTags.variableTagsGet);
app.post('/variableTags',auth.auth, variableTags.variableTagsPost);

//start execution
app.post('/executionengine/startexecution', executionengine.startexecutionPost);

//stop
app.post('/executionengine/stopexecution',auth.auth, executionengine.stopexecutionPost);
app.post('/executionengine/actionresult',executionengine.actionresultPost);
app.post('/executionengine/logmessage',executionengine.logPost);

//heartbeat
app.post('/heartbeat',heartbeat.heartbeatPost);

//results
app.get('/results/:id',results.resultsGet);
app.get('/resultslogs/:id/:executionid',results.logsGet);

//execution status
app.get('/executionstatus/:id',executionstatus.executionStatusGet);

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

//testcases
app.get('/testcases',auth.auth, testcases.testcasesGet);
app.put('/testcases/:id',auth.auth, testcases.testcasesPut);
app.post('/testcases',auth.auth, testcases.testcasesPost);
app.del('/testcases/:id',auth.auth, testcases.testcasesDelete);
app.post('/testcasetocode',auth.auth, testcases.testCaseToCode);

//testcaseTags
app.get('/testcasetags',auth.auth, testcaseTags.testcaseTagsGet);
app.post('/testcasetags',auth.auth, testcaseTags.testcaseTagsPost);

//executions
app.get('/executions',auth.auth, executions.executionsGet);
app.put('/executions/:id',auth.auth, executions.executionsPut);
app.post('/executions/:id',executions.executionsPost);
app.del('/executions/:id',auth.auth, executions.executionsDelete);

//executionTags
app.get('/executiontags',auth.auth, executionTags.executionTagsGet);
app.post('/executiontags',auth.auth, executionTags.executionTagsPost);

//executiontestcases
app.get('/executiontestcases/:id',auth.auth, executiontestcases.executiontestcasesGet);
app.put('/executiontestcases/:id',auth.auth, executiontestcases.executiontestcasesPut);
app.put('/executiontestcases',auth.auth, executiontestcases.executiontestcasesPutArray);
app.post('/executiontestcases',auth.auth, executiontestcases.executiontestcasesPost);
app.post('/executiontestcases/udatetestset',auth.auth, executiontestcases.executionsTestSetUpdatePost);
app.del('/executiontestcases/:id',auth.auth, executiontestcases.executiontestcasesDelete);
app.put('/executiontestcasenotes',auth.auth, executiontestcases.executionNotes);

//machineRoles
app.get('/machineroles',auth.auth, machineroles.machineRolesGet);
app.post('/machineroles',auth.auth, machineroles.machineRolesPost);

//users
app.get('/users', auth.auth, users.usersGet);
app.put('/users/:id',auth.auth, users.usersPut);
app.post('/users',auth.auth, users.usersPost);
app.del('/users/:id',auth.auth, users.usersDelete);
app.post('/canadduser',auth.auth, users.canAddUser);
app.post('/users/sshkey',auth.auth, users.usersSSHKeyPost);
app.get('/users/sshkey',auth.auth, users.usersSSHKeyGet);

//testsets
app.get('/testsets', auth.auth, testsets.testsetsGet);
app.put('/testsets/:id',auth.auth, testsets.testsetsPut);
app.post('/testsets',auth.auth, testsets.testsetsPost);
app.del('/testsets/:id',auth.auth, testsets.testsetsDelete);

//hosts
app.get('/hosts', auth.auth, hosts.hostsGet);
app.put('/hosts/:id',auth.auth, hosts.hostsPut);
app.post('/hosts',auth.auth, hosts.hostsPost);
app.del('/hosts/:id',auth.auth, hosts.hostsDelete);

//templates
app.get('/templates', auth.auth, templates.templatesGet);
app.put('/templates/:id',auth.auth, templates.templatesPut);
app.post('/templates',auth.auth, templates.templatesPost);
app.del('/templates/:id',auth.auth, templates.templatesDelete);

//userStates
/*
app.get('/userStates', auth.auth, users.userStatesGet);
app.put('/userStates/:id',auth.auth, users.userStatesPut);
app.post('/userStates',auth.auth, users.userStatesPost);
app.del('/userStates/:id',auth.auth, users.userStatesDelete);
*/

//projects
app.get('/projects', auth.auth, projects.projectsGet);
app.put('/projects/:id',auth.auth, projects.projectsPut);
app.post('/projects',auth.auth, projects.projectsPost);
app.del('/projects/:id',auth.auth, projects.projectsDelete);
app.post('/projects/clone',auth.auth, projects.projectsClone);

//userTags
app.get('/userTags',auth.auth, userTags.userTagsGet);
app.post('/userTags',auth.auth, userTags.userTagsPost);

//scripts
app.get('/scripts/root',auth.auth, scripts.scriptsGet);
app.post('/scripts/delete',auth.auth, scripts.scriptsDelete);
app.post('/scripts/copy',auth.auth, scripts.scriptsCopy);
app.post('/scripts/push',auth.auth, scripts.scriptsPush);
app.post('/scripts/pull',scripts.scriptsPull);
app.get('/scripts/notpushed',scripts.notPushedScripts);
app.post('/scripts/findtext',scripts.findText);


//script
app.get('/runpip',auth.auth, script.runPipGet);
app.post('/script/get',auth.auth, script.scriptGet);
app.post('/script/resolveconflict',auth.auth, script.resolveConflict);
app.post('/script',auth.auth, script.scriptPost);
app.put('/script',auth.auth, script.scriptPut);
app.post('/script/mergeinfo',auth.auth, script.mergeInfo);

//folder
app.post('/folder',auth.auth, folder.folderPost);
app.put('/folder',auth.auth, folder.folderPut);

//folder
app.post('/fileupload',auth.auth, fileupload.upload);

//methodFinder
app.post('/methodFinder',auth.auth, methodFinder.methodFinderPost);

common.initLogger("server");
common.parseConfig(function(){
    common.initDB(common.Config.DBPort,function(){
        common.cleanUpExecutions();
        common.cleanUpUserStatus(function(){
            var server = require('http').createServer(app);
            server.listen(common.Config.AppServerPort, function(){
              realtime.initSocket(server);
               common.logger.log("Express server listening on port %d in %s mode", common.Config.AppServerPort, app.settings.env);
            });
        });
        auth.loadSessions();
    });

});
