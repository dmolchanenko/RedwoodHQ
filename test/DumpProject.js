var common = require('../common');
var projectName = "Selenium";
common.initDB(27017,function(){
    GetColData("actions",function(actions){
        actions.forEach(function(action){
            console.log("automationframework.actions.save("+ParseID(JSON.stringify(action),0)+");")
            //console.log(ParseID(JSON.stringify(action)));
        });
        console.log("");
        GetColData("testcases",function(actions){
            actions.forEach(function(action){
                console.log("automationframework.testcases.save("+ParseID(JSON.stringify(action),0)+");")
            });
            console.log("");
            GetColData("testsets",function(actions){
                actions.forEach(function(action){
                    console.log("automationframework.testsets.save("+ParseID(JSON.stringify(action),0)+");")
                });
                console.log("");
                GetColData("executions",function(actions){
                    actions.forEach(function(action){
                        console.log("automationframework.executions.save("+ParseID(JSON.stringify(action),0)+");")
                    });
                    console.log("");

                });
            });
        });
    });
});


function ParseID(record,startPos){


    var start = record.indexOf("_id",startPos) + 6;
    var id = record.substring(start,start+24);
    var newID = "ObjectId(\""+id+"\")";

    record = record.replace('"'+id+'"',newID);

    start = record.indexOf("_id",start);
    if (start != -1){
        return ParseID(record,start);
    }
    else{
        return record;
    }
}

function GetColData(collectionName,callback){
    common.getDB().collection(collectionName, function(err, collection) {
        collection.find({project:projectName}, {}, function(err, cursor) {
            var allRecords = [];
            cursor.each(function(err, data) {
                if(data == null) {
                    callback(allRecords);
                    return;
                }
                //data._id = "ObjectId(\""+data._id+"\")";
                //delete data._id;
                allRecords.push(data);
                //console.log(JSON.stringify(data));
                //actions.push(action);
            });
        })
    });
}

