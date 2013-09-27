var realtime = require("./realtime");

exports.testcaseTagsGet = function(req, res){
    var app =  require('../common');
    GetTestCaseTags(app.getDB(),{project:req.cookies.project},function(data){
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
    data.project = req.cookies.project;
    CreateTestCaseTags(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            tags: returnData
        });
        returnData.forEach(function(data){
            realtime.emitMessage("AddTestCaseTags",data);
        });
    });
};

function CreateTestCaseTags(db,data,callback){
    db.collection('testcaseTags', function(err, collection) {
        collection.findOne({project:data.project,value:data.value},{},function(err,foundTag){
            if (!foundTag){
                data._id = db.bson_serializer.ObjectID(data._id);
                collection.insert(data, {safe:true},function(err,returnData){
                    callback(returnData);
                });
            }
            else{
                callback([foundTag]);
            }
        });
    });
}

function DeleteTestCaseTags(db,data,callback){
    db.collection('testcaseTags', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            realtime.emitMessage("DeleteTestCaseTags",data);
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

exports.CleanUpTestCaseTags = function(req){
    var app =  require('../common');
    var db = app.getDB();

    var callback = function(tags){
        db.collection('testcases', function(err, collection) {
            tags.forEach(function(tag, index, array){
                collection.find({project:req.cookies.project,tag:tag.value}).count(function(err,number){
                    if (number == 0){
                        DeleteTestCaseTags(db,{value:tag.value,project:req.cookies.project});
                    }
                });
            });
        });
    };
    GetTestCaseTags(db,{project:req.cookies.project},callback);
};