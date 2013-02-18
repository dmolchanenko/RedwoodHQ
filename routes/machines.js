var realtime = require("./realtime");

exports.machinesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateMachines(app.getDB(),data,function(err){
        if (!err){
            realtime.emitMessage("UpdateMachines",data);
        }
        res.contentType('json');
        res.json({
            success: !err,
            machines: req.body
        });
    });

    var Tags = require('./machineTags');
    Tags.CleanUpMachineTags();
    var Roles = require('./machineRoles');
    Roles.CleanUpMachineRoles();
};

exports.machinesGet = function(req, res){
    var app =  require('../common');
    GetMachines(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            machines: data
        });
    });
};

exports.machinesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteMachines(app.getDB(),{_id: id},function(err){
        if (!err){
            realtime.emitMessage("DeleteMachines",{id:req.params.id});
        }
        res.contentType('json');
        res.json({
            success: !err,
            machines: []
        });
    });
    var Tags = require('./machineTags');
    Tags.CleanUpMachineTags();
    var Roles = require('./machineRoles');
    Roles.CleanUpMachineRoles();
};

exports.machinesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateMachines(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            machines: returnData
        });
        //realtime.emitMessage("AddMachines",returnData);
    });
};

function CreateMachines(db,data,callback){
    db.collection('machines', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateMachines(db,data,callback){
    db.collection('machines', function(err, collection) {

        //collection.update({_id:data._id},data,{safe:true},function(err){
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteMachines(db,data,callback){
    db.collection('machines', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetMachines(db,query,callback){
    var machines = [];

    db.collection('machines', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, machine) {
                if(machine == null) {
                    callback(machines);
                }
                machines.push(machine);
            });
        })
    })
}