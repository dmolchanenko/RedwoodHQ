var realtime = require("./realtime");
var ObjectID = require('mongodb').ObjectID;

exports.variablesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = new ObjectID(data._id);
    data.project = req.cookies.project;
    UpdateVariables(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateVariables",data);
        res.contentType('json');
        res.json({
            success: !err,
            variables: req.body
        });
    });

    var varTags = require('./variableTags');
    varTags.CleanUpVariableTags(req);
};

exports.variablesGet = function(req, res){
    var app =  require('../common');
    GetVariables(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            variables: data
        });
    });
};

exports.variablesDelete = function(req, res){
    var app =  require('../common');
    //DeleteVariables(app.getDB(),{_id: req.params.id},function(err){
    var db = app.getDB();
    var id = new ObjectID(req.params.id);
    DeleteVariables(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteVariables",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            variables: []
        });
    });
    var varTags = require('./variableTags');
    varTags.CleanUpVariableTags(req);
};

exports.variablesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateVariables(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            variables: returnData
        });
        realtime.emitMessage("AddVariables",data);
    });
};

function CreateVariables(db,data,callback){
    db.collection('variables', function(err, collection) {
        data._id = new ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateVariables(db,data,callback){
    db.collection('variables', function(err, collection) {

        //collection.update({_id:data._id},data,{safe:true},function(err){
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteVariables(db,data,callback){
    db.collection('variables', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

exports.getVariables = function(db,query,callback){
    GetVariables(db,query,callback);
};

function GetVariables(db,query,callback){
    var variables = [];

    db.collection('variables', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, variable) {
                if(variable == null) {
                    callback(variables);
                }
                variables.push(variable);
            });
        })
    })
}