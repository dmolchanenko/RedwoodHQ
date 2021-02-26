var argv = require('optimist')
    .usage('Usage: $0 --project [project](optional)')
    .argv;
var elasticsearch = require('../routes/elasticsearch');
var common = require('../common');
common.initLogger("cli");

common.parseConfig(function(){
    common.initDB(common.Config.DBPort,function(){
        var db = common.getDB();
        if(argv.project){
            db.collection('projects', function(err, collection) {
                collection.findOne({name:argv.project}, {}, function(err, project) {
                    if(err || project == null){
                        console.log("ERROR: project "+argv.project+" was not found.");
                        process.exit(1)
                    }
                    GetAllTestCases(db,{project:argv.project},function(testcases){
                        testcases.forEach(function(testcase){
                            elasticsearch.indexTestCase(testcase,"PUT");
                            console.log("Importing "+testcase.name)
                        })
                    })
                })
            })
        }
        else{
            GetAllTestCases(db,{},function(testcases){
                testcases.forEach(function(testcase){
                    elasticsearch.indexTestCase(testcase,"PUT");
                    console.log("Importing "+testcase.name)
                })
            })
        }
    });
});

function GetAllTestCases(db,query,callback){
    var testcases = [];

    db.collection('testcases', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            if(err){
                console.log("ERROR: unable to get test cases. "+err);
                process.exit(1)
            }
            cursor.each(function(err, testcase) {
                if(err){
                    console.log("ERROR: unable to get test cases. "+err);
                    process.exit(1)
                }
                if(testcase == null) {
                    callback(testcases);
                }
                if(!testcase.lastModified) testcase.lastModified = new Date();
                testcases.push(testcase);
            });
        })
    })
}

