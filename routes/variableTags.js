
exports.variableTagsGet = function(req, res){
    var app =  require('../common');
    GetVariableTags(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            tags: data
        });
    });
};

exports.variableTagsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    CreateVariableTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
    });
};

function CreateVariableTags(db,data,callback){
    db.collection('variableTags', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function DeleteVariableTags(db,data,callback){
    db.collection('variableTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetVariableTags(db,query,callback){
    var tags = [];
    db.collection('variableTags', function(err, collection) {
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

exports.CleanUpVariableTags = function(req){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('variables', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({project:req.cookies.project,tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteVariableTags(db,{value:tag.value,project:req.cookies.project});
                    }
                });
            });
        });
    };
    GetVariableTags(db,{project:req.cookies.project},callback);
};