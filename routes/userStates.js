var ObjectID = require('mongodb').ObjectID;

exports.GetUserProject = function(username,callback){
    var app =  require('../common');
    var db = app.getDB();

    db.collection('userStates', function(err, collection) {
        collection.findOne({username:username}, {}, function(err, userState) {
            if(userState != null) {
                callback(userState.project);
            }
            else{
                callback(null);
            }
        })
    })
};

exports.userStatesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
    UpdateUserStates(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            userStates: req.body
        });
    });
};

exports.userStatesGet = function(req, res){
    var app =  require('../common');
    GetUserStates(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            userStates: data
        });
    });
};

exports.userStatesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = new ObjectID(req.params.id);
    DeleteUserStates(app.getDB(),{_id: id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            userStates: []
        });
    });
};

exports.userStatesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateUserStates(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            userStates: returnData
        });
    });
};

function CreateUserStates(db,data,callback){
    db.collection('userStates', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateUserStates(db,data,callback){
    db.collection('userStates', function(err, collection) {
        collection.findOne({_id:data._id},{},function(err,u){
            u.name = data.name;
            u._id = data._id;
            collection.save(u,{safe:true},function(err){
                if (err) console.warn(err.message);
                else callback(err);
            });
        });
    });

}

function DeleteUserStates(db,data,callback){
    db.collection('userStates', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetUserStates(db,query,callback){
    var userStates = [];

    db.collection('userStates', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, project) {
                if(project == null) {
                    callback(userStates);
                    return;
                }
                userStates.push(project);
            });
        })
    })
}