exports.executiontestcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    UpdateExecutionTestCases(app.getDB(),data,function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executiontestcases: req.body
        });
    });
};

exports.executiontestcasesGet = function(req, res){
    var app =  require('../common');
    GetTestCases(app.getDB(),{executionID:req.params.id},function(data){
        res.contentType('json');
        res.json({
            success: true,
            executiontestcases: data
        });
    });
};

exports.executiontestcasesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteExecutionTestCases(app.getDB(),{_id: id},function(err){
        res.contentType('json');
        res.json({
            success: !err,
            executiontestcases: []
        });
    });
};

exports.executiontestcasesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    CreateExecutionTestCases(app.getDB(),data,function(){
        res.contentType('json');
        res.json({
            success: true
        });
    });
};

function CreateExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        var count = 0;
        for (var i = 0;i<data.length;i++){
            //data[i]._id = db.bson_serializer.ObjectID(data[i]._id);
            collection.insert(data[i], {safe:true},function(err,returnData){
                count++;
                if (count == data.length){
                    callback();
                }
                //callback(returnData);
            });
        }
    });
}

function UpdateExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
        });
    });

}

function DeleteExecutionTestCases(db,data,callback){
    db.collection('executiontestcases', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
        });
    });

}

function GetTestCases(db,query,callback){
    var executiontestcases = [];

    db.collection('executiontestcases', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, execution) {
                if(execution == null) {
                    callback(executiontestcases);
                    return;
                }
                executiontestcases.push(execution);
            });
        })
    })
}

exports.GetExecutionTestCases = function(db,query,callback){
    GetTestCases(db,query,callback);
};