
exports.machineTagsGet = function(req, res){
    var app =  require('../common');
    GetMachineTags(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            tags: data
        });
    });
};

exports.machineTagsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateMachineTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
    });
};

function CreateMachineTags(db,data,callback){
    db.collection('machineTags', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function DeleteMachineTags(db,data,callback){
    db.collection('machineTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetMachineTags(db,query,callback){
    var tags = [];
    db.collection('machineTags', function(err, collection) {
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

exports.CleanUpMachineTags = function(){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('machines', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({project:req.cookies.project,tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteMachineTags(db,{value:tag.value,project:req.cookies.project});
                    }
                });
            });
        });
    };
    GetMachineTags(db,{},callback);
};