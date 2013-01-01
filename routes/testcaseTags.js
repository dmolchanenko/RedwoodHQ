
exports.testcaseTagsGet = function(req, res){
    var app =  require('../common');
    GetTestCaseTags(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            tags: data
        });
    });
};

exports.testcaseTagsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateTestCaseTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
    });
};

function CreateTestCaseTags(db,data,callback){
    db.collection('testcaseTags', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function DeleteTestCaseTags(db,data,callback){
    db.collection('testcaseTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            if (callback != undefined){
                callback(err);
            }
        });
    });

}

function GetTestCaseTags(db,query,callback){
    var tags = [];
    db.collection('testcaseTags', function(err, collection) {
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

exports.CleanUpTestCaseTags = function(){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('testcases', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteTestCaseTags(db,tag);
                    }
                });
            });
        });
    };
    GetTestCaseTags(db,{},callback);
};