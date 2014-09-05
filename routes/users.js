var license = require("./license");
var app =  require('../common');
var fs = require('fs');
var git = require('../gitinterface/gitcommands');
var path = require('path');
var common = require("../common");
var spawn = require('child_process').spawn;
var realtime = require("./realtime");

exports.usersPut = function(req, res){
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateUsers(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateUsers",data);
        res.contentType('json');
        res.json({
            success: !err,
            users: req.body
        });
    });
    var Tags = require('./userTags');
    Tags.CleanUpUserTags(req);
};

exports.usersGet = function(req, res){
    GetUsers(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            users: data
        });
    });
};

exports.usersDelete = function(req, res){
    //DeleteUsers(app.getDB(),{_id: req.params.id},function(err){
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    if (req.body.username == "admin") return;
    DeleteUsers(app.getDB(),{_id: id,username:req.body.username},function(err){
        realtime.emitMessage("DeleteUsers",{id: id.__id,username:req.body.username});
        res.contentType('json');
        res.json({
            success: !err,
            users: []
        });
    });
    var Tags = require('./userTags');
    Tags.CleanUpUserTags(req);
};

exports.usersPost = function(req, res){
    var data = req.body;
    delete data._id;
    CreateUsers(app.getDB(),data,function(returnData){
        delete returnData.password;
        res.contentType('json');
        res.json({
            success: true,
            users: returnData
        });

        realtime.emitMessage("AddUsers",data);
    });
};


exports.canAddUser = function(req, res){
    license.numberOfUsers(function(numberOfUsers){
        app.getDB().collection('users', function(err, collection) {
            collection.find({}, {}, function(err, cursor) {
                var validUsers = 0;
                cursor.each(function(err, user) {
                    if(user == null) {
                        if (validUsers <= numberOfUsers){
                            res.contentType('json');
                            res.json({
                                success: true,
                                ableToAdd: true
                            });
                        }
                        else{
                            res.contentType('json');
                            res.json({
                                success: true,
                                ableToAdd: false
                            });
                        }
                        return;
                    }
                    if(user.enabled != false){
                        validUsers++;
                    }
                });
            })
        });
    })
};

function CreateUsers(db,data,callback){
    db.collection('users', function(err, collection) {
        var hash = require('crypto').createHmac('md5',"redwood").update(data.password).digest('hex');
        data.password = hash;
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            db.collection('projects',function(err,collection){
                collection.find({},{},function(err,cursor){
                    cursor.each(function(err, project) {
                        if(project == null) {
                            callback(returnData);
                            return;
                        }
                        var projectPath = path.resolve(__dirname,"../public/automationscripts/"+project.name);
                        var masterBranch = projectPath + "/master.git";
                        fs.mkdirSync(projectPath + "/" + returnData[0].username);

                        git.clone(projectPath + "/" + returnData[0].username,masterBranch,function(){
                            if(fs.existsSync(projectPath + "/" + returnData[0].username + "/" +"src") == false){
                                fs.mkdirSync(projectPath + "/" + returnData[0].username + "/" +"src");
                            }
                            if(fs.existsSync(projectPath + "/" + returnData[0].username + "/" +"bin") == false){
                                fs.mkdirSync(projectPath + "/" + returnData[0].username + "/" +"bin");
                            }
                            git.setGitUser(projectPath + "/" + returnData[0].username,returnData[0].username,returnData[0].email)
                        });
                    });
                });
            });
        });
    });
}

function UpdateUsers(db,data,callback){
    db.collection('users', function(err, collection) {
        if (data.password != ""){
            var hash = require('crypto').createHmac('md5',"redwood").update(data.password).digest('hex');
            data.password = hash;
        }else{
            delete data.password;
        }
        //collection.update({_id:data._id},{$set:{role:data.role},$set:{}},{safe:true},function(err){
        collection.findOne({_id:data._id},{},function(err,u){
            u.role = data.role;
            u.name = data.name;
            u.tag = data.tag;
            u.email = data.email;
            u._id = data._id;
            if(data.password){
                u.password = data.password;
            }
            //myColl.save(j);
            collection.save(u,{safe:true},function(err){
                if (err) console.warn(err.message);
                else callback(err);
            });
        });
    });

}

function DeleteUsers(db,data,callback){
    db.collection('users', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            db.collection('projects',function(err,collection){
                collection.find({},{},function(err,cursor){
                    cursor.each(function(err, project) {
                        if(project == null) {
                            callback(err);
                            return;
                        }
                        var projectPath = path.resolve(__dirname,"../public/automationscripts/"+project.name);
                        var userPath = path.resolve(__dirname,"../public/automationscripts/"+project.name+"/"+data.username);

                        var delDir = spawn(path.resolve(__dirname,'../vendor/Git/bin/rm'),['-rf',userPath],{cwd: projectPath,timeout:300000});
                        //var delDir = spawn("rmdir",['/S','/Q',userPath],{cwd: projectPath,timeout:300000});

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
                    });
                });
            });
        });
    });

}

exports.getAllUsers = function(callback){
    GetUsers(app.getDB(),{},callback)
};

function GetUsers(db,query,callback){
    var users = [];

    db.collection('users', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, user) {
                if(user == null) {
                    callback(users);
                    return;
                }
                user.password = "";
                users.push(user);
            });
        })
    })
}