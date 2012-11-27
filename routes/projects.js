exports.projectsPut = function(req, res){
    var app =  require('../common');
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
    var app =  require('../common');
    GetProjects(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            projects: data
        });
    });
};

exports.projectsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteProjects(app.getDB(),{_id: id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            projects: []
        });
    });
};

exports.projectsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateProjects(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            projects: returnData
        });
    });
};

function CreateProjects(db,data,callback){
    db.collection('projects', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
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

function DeleteProjects(db,data,callback){
    db.collection('projects', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

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