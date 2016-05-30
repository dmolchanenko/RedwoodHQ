var realtime = require("./realtime");
var ObjectID = require('mongodb').ObjectID;

exports.machineRolesGet = function(req, res){
    var app =  require('../common');
    GetMachineRoles(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            roles: data
        });
    });
};

exports.machineRolesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateMachineRoles(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            roles: returnData
        });
        returnData.forEach(function(data){
            realtime.emitMessage("AddMachineRoles",data);
        });
    });
};

function CreateMachineRoles(db,data,callback){
    db.collection('machineRoles', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function DeleteMachineRoles(db,data,callback){
    db.collection('machineRoles', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            realtime.emitMessage("DeleteMachineRoles",data);
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetMachineRoles(db,query,callback){
    var tags = [];
    db.collection('machineRoles', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, tag) {
                if(tag == null) {
                    callback(tags);
                }
                tags.push(tag);
            });
        })
    })
}

exports.CleanUpMachineRoles = function(req){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(roles){
        db.collection('machines', function(err, collection) {
            roles.forEach(function(role, index, array){
                if (role.value != 'Default'){
                    collection.find({roles:role.value}).count(function(err,number){
                        if (number == 0){
                            DeleteMachineRoles(db,{value:role.value});
                        }
                    });
                }
            });
        });
    };
    GetMachineRoles(db,{},callback);
};