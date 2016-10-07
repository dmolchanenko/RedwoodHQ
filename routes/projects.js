var scripts = require("../routes/scripts");
var common = require("../common");
var fs = require('fs');
var path = require('path');
var realtime = require("../routes/realtime");
var app =  require('../common');
var spawn = require('child_process').spawn;
var cpr = require('cpr').cpr;
var git = require('../gitinterface/gitcommands');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
var ObjectID = require('mongodb').ObjectID;

exports.allProjects = function(callback){
    GetProjects(app.getDB(),{},callback);
};

exports.projectsPut = function(req, res){
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
    //if(data.externalRepo == true){
    //    git.removeRemote(rootDir+req.cookies.project+"/"+req.cookies.username,"remoteRepo",function(){
    //        git.addRemote(rootDir+req.cookies.project+"/"+req.cookies.username,"remoteRepo",data.externalRepoURL)
    //    })
    //}
    UpdateProjects(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            projects: req.body
        });
    });
};

exports.projectsGet = function(req, res){
    GetProjects(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            projects: data
        });
    });
};

exports.projectsDelete = function(req, res){
    var db = app.getDB();
    var id = new ObjectID(req.params.id);
    DeleteProjects(app.getDB(),{_id: id},req.body.name,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            projects: []
        });
    });
    realtime.emitMessage("deleteProject",{name:req.body.name,id:id});
};

exports.projectsPost = function(req, res){
    var data = req.body;
    delete data._id;
    if(data.externalRepo == true){
        git.removeRemote(rootDir+req.cookies.project+"/"+req.cookies.username,"remoteRepo",function(){
            git.addRemote(rootDir+req.cookies.project+"/"+req.cookies.username,"remoteRepo",data.externalRepoURL)
        })
    }
    CreateProjects(data,true,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            projects: returnData
        });
    });
};

exports.projectsClone = function(req, res){
    var data = req.body;
    CloneProjects(data,true,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            projects: returnData
        });
    });
};

exports.projectCreate = function(data,callback){
    CreateProjects(data,false,callback);
};

function CreateProjects(data,emit,callback){
    app.getDB().collection('projects', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            scripts.CreateNewProject(data.name,data.language,data.template,function(){
                callback(returnData);
                if (emit == true){
                    realtime.emitMessage("newProject",returnData[0]);
                }
            });
        });
    });
}

function CloneProjects(data,emit,callback){
    if(fs.existsSync(path.resolve(__dirname,"../public/automationscripts/"+data.name))){
        return;
    }
    var toClone = data.toClone;
    delete data.toClone;

    var db = app.getDB();
    db.collection('projects', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            cpr(path.resolve(__dirname,"../public/automationscripts/"+toClone), path.resolve(__dirname,"../public/automationscripts/"+data.name), function (err) {
                var pointOriginRepo = function(){
                    fs.readdir(path.resolve(__dirname,"../public/automationscripts/"+data.name),function(err, files){
                        files.forEach(function(file){
                            fs.stat(path.resolve(__dirname,"../public/automationscripts/"+data.name+"/"+file),function(err,stats){
                                if(stats.isDirectory()){
                                    git.changeOrginURL(path.resolve(__dirname,"../public/automationscripts/"+data.name+"/"+file),path.resolve(__dirname,"../public/automationscripts/"+data.name+"/master.git"));
                                }
                            })
                        })
                    })
                };

                var cloneCollection = function(name){
                    db.collection(name, function(err, collection) {
                        collection.find({project:toClone},{},function(err, cursor) {
                            cursor.each(function(err, cloneData) {
                                if(cloneData == null) {
                                    return;
                                }
                                cloneData.project = data.name;
                                delete cloneData._id;
                                collection.insert(cloneData, {safe:true},function(err,returnData){

                                })
                            });
                        });
                    });
                };

                var actionMapping = {};
                var testcaseMapping = {};
                var updateTestCases = function(){
                    db.collection('testcases', function(err, collection) {
                        collection.find({project:toClone},{},function(err, cursor) {
                            cursor.each(function(err, cloneData) {
                                if(cloneData == null) {
                                    var updateTestCaseCollections = function(name){
                                        db.collection(name, function(err, collection) {
                                            collection.find({project:toClone},{},function(err, cursor) {
                                                cursor.each(function(err, cloneData) {
                                                    if(cloneData == null) {
                                                        return;
                                                    }
                                                    if(cloneData.afterState && cloneData.afterState != ""){
                                                        cloneData.afterState = actionMapping[cloneData.afterState]
                                                    }
                                                    if(cloneData.type == 'collection'){
                                                        cloneData.collection.forEach(function(step){
                                                            step.actionid = actionMapping[step.actionid];
                                                        });
                                                    }
                                                    if(name == 'testcaseshistory'){
                                                        delete cloneData._id;
                                                        cloneData.project = data.name;
                                                        cloneData.testcaseID = new ObjectID(testcaseMapping[cloneData.testcaseID.toString()]);
                                                        collection.insert(cloneData, {safe:true},function(err,returnData){
                                                        })
                                                    }
                                                    else{
                                                        cloneData._id = new ObjectID(testcaseMapping[cloneData._id.toString()]);
                                                        cloneData.project = data.name;
                                                        collection.insert(cloneData, {safe:true},function(err,returnData){
                                                        })
                                                    }
                                                });
                                            });
                                        });
                                    };
                                    updateTestCaseCollections('testcases');
                                    updateTestCaseCollections('testcaseshistory');
                                    return;
                                }
                                var id = cloneData._id.toString();
                                cloneData.project = data.name;

                                cloneData._id = new ObjectID();
                                testcaseMapping[id] = cloneData._id.toString();
                            });
                        });
                    });
                };

                db.collection('actions', function(err, collection) {
                    collection.find({project:toClone},{},function(err, cursor) {
                        cursor.each(function(err, cloneData) {
                            if(cloneData == null) {
                                updateTestCases();
                                var updateActionCollections = function(name){
                                    db.collection(name, function(err, collection) {
                                        collection.find({project:toClone},{},function(err, cursor) {
                                            cursor.each(function(err, cloneData) {
                                                if(cloneData == null) {
                                                    return;
                                                }
                                                if(cloneData.type == 'collection'){
                                                    cloneData.collection.forEach(function(step){
                                                        step.actionid = actionMapping[step.actionid];
                                                    });
                                                }
                                                if(name == 'actionshistory'){
                                                    delete cloneData._id;
                                                    cloneData.project = data.name;
                                                    cloneData.actionID = new ObjectID(actionMapping[cloneData.actionID.toString()]);
                                                    collection.insert(cloneData, {safe:true},function(err,returnData){
                                                    })
                                                }
                                                else{
                                                    cloneData._id = new ObjectID(actionMapping[cloneData._id.toString()]);
                                                    cloneData.project = data.name;
                                                    collection.insert(cloneData, {safe:true},function(err,returnData){
                                                    })
                                                }
                                            });
                                        });
                                    });
                                };
                                updateActionCollections('actions');
                                updateActionCollections('actionshistory');
                                return;
                            }
                            var id = cloneData._id.toString();
                            cloneData.project = data.name;

                            cloneData._id = new ObjectID();
                            actionMapping[id] = cloneData._id.toString();
                        });
                    });
                });

                cloneCollection('variables');
                cloneCollection('actionTags');
                cloneCollection('testcaseTags');
                cloneCollection('testsets');
                cloneCollection('variableTags');
                pointOriginRepo();

                callback(returnData);
                if (emit == true){
                    realtime.emitMessage("newProject",returnData[0]);
                }
            });
        });
    });
}

function UpdateProjects(db,data,callback){
    db.collection('projects', function(err, collection) {
        //collection.findOne({name:data.name},{},function(err,u){
            //u.projectkey = data.projectkey;
            collection.save(data,{safe:true},function(err){
                if (err) console.warn(err.message);
                else callback(err);
            });
        //});
    });

}

function DeleteProjects(db,data,projectName,callback){
    db.collection('projects', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            db.collection('actions', function(err, collection) {
                collection.remove({project:projectName},{safe:true},function(err) {
                });
            });
        });
    });
    db.collection('testcases', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('testcaseshistory', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('actionshistory', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('variables', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('actionTags', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('executions', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('executionTags', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('testcaseTags', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('testsets', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('variableTags', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    db.collection('executionTags', function(err, collection) {
        collection.remove({project:projectName},{safe:true},function(err) {
        });
    });

    var projectPath = path.resolve(__dirname,"../public/automationscripts/"+projectName);
    var delDir = spawn(path.resolve(__dirname,'../vendor/Git/usr/bin/rm'),['-rf',projectPath],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
    //var delDir = spawn("rmdir",['/S','/Q',projectPath],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
    /*
    var toDelete = [];
    common.walkDir(projectPath,function(){
        toDelete.reverse();
        toDelete.push(projectPath);
        toDelete.forEach(function(file,index,array){
            try{
                if (fs.statSync(file).isDirectory()){
                    fs.rmdirSync(file);
                }
                else{
                    fs.unlinkSync(file);

                }
            }
            catch(exception){
                console.log(exception);
            }
        });
    },function(file){
        toDelete.push(file);
    });
    */
    callback();
}

function GetProjects(db,query,callback){
    var projects = [];

    db.collection('projects', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, project) {
                if(project == null) {
                    callback(projects);
                    return;
                }
                projects.push(project);
            });
        })
    })
}