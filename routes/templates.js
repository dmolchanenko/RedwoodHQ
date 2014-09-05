var realtime = require("./realtime");

exports.templatesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateTemplates(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateTemplates",data);
        res.contentType('json');
        res.json({
            success: !err,
            templates: req.body
        });
    });
};

exports.templatesGet = function(req, res){
    var app =  require('../common');
    GetTemplates(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            templates: data
        });
    });
};

exports.templatesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteTemplates(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteTemplates",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            templates: []
        });
    });
};

exports.templatesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateTemplates(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            templates: returnData
        });
        realtime.emitMessage("AddTemplates",data);
    });
};

function CreateTemplates(db,data,callback){
    db.collection('templates', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateTemplates(db,data,callback){
    db.collection('templates', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteTemplates(db,data,callback){
    db.collection('templates', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetTemplates(db,query,callback){
    var templates = [];

    db.collection('templates', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, testset) {
                if(testset == null) {
                    callback(templates);
                    return;
                }
                templates.push(testset);
            });
        })
    })
}