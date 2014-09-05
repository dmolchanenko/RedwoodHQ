var scripts = require("../routes/scripts");
var common = require("../common");
var fs = require('fs');
var path = require('path');
var realtime = require("../routes/realtime");
var app =  require('../common');
var spawn = require('child_process').spawn;

exports.allProjects = function(callback){
    GetProjects(app.getDB(),{},callback);
};

exports.projectsPut = function(req, res){
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
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
    var id = db.bson_serializer.ObjectID(req.params.id);
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
    CreateProjects(data,true,function(returnData){
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
        data._id = app.getDB().bson_serializer.ObjectID(data._id);
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

function UpdateProjects(db,data,callback){
    db.collection('projects', function(err, collection) {
        collection.findOne({_id:data._id},{},function(err,u){
            u.projectkey = data.projectkey;
            u.name = data.name;
            u._id = data._id;
            collection.save(u,{safe:true},function(err){
                if (err) console.warn(err.message);
                else callback(err);
            });
        });
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
    var delDir = spawn(path.resolve(__dirname,'../vendor/Git/bin/rm'),['-rf',projectPath],{cwd: path.resolve(__dirname,"../public/automationscripts/"),timeout:300000});
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