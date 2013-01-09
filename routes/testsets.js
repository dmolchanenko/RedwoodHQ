exports.testsetsPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateTestSets(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            testsets: req.body
        });
    });
};

exports.testsetsGet = function(req, res){
    var app =  require('../common');
    GetTestSets(app.getDB(),{},function(data){
        res.contentType('json');
        res.json({
            success: true,
            testsets: data
        });
    });
};

exports.testsetsDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteTestSets(app.getDB(),{_id: id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            testsets: []
        });
    });
};

exports.testsetsPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    CreateTestSets(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            testsets: returnData
        });
    });
};

function CreateTestSets(db,data,callback){
    db.collection('testsets', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
        });
    });
}

function UpdateTestSets(db,data,callback){
    db.collection('testsets', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteTestSets(db,data,callback){
    db.collection('testsets', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetTestSets(db,query,callback){
    var testsets = [];

    db.collection('testsets', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, testset) {
                if(testset == null) {
                    callback(testsets);
                    return;
                }
                testsets.push(testset);
            });
        })
    })
}