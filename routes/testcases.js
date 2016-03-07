var realtime = require("./realtime");
var executions = require("./executions");

exports.testcasesPut = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    data._id = db.bson_serializer.ObjectID(data._id);
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    UpdateTestCases(app.getDB(),data,function(err){
        realtime.emitMessage("UpdateTestCases",data);
        res.contentType('json');
        res.json({
            success: !err,
            testcases: req.body
        });
    });

    var Tags = require('./testcaseTags');
    Tags.CleanUpTestCaseTags(req);
};

exports.testcasesGet = function(req, res){
    var app =  require('../common');
    GetTestCases(app.getDB(),{project:req.cookies.project},function(data){
        res.contentType('json');
        res.json({
            success: true,
            testcases: data
        });
    });
};

exports.testcasesDelete = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var id = db.bson_serializer.ObjectID(req.params.id);
    DeleteTestCases(app.getDB(),{_id: id},function(err){
        realtime.emitMessage("DeleteTestCases",{id: req.params.id});
        res.contentType('json');
        res.json({
            success: !err,
            testcases: []
        });
    });
    var Tags = require('./testcaseTags');
    Tags.CleanUpTestCaseTags(req);
};

exports.testcasesPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    delete data._id;
    data.project = req.cookies.project;
    data.user =  req.cookies.username;
    CreateTestCases(app.getDB(),data,function(returnData){
        res.contentType('json');
        res.json({
            success: true,
            testcases: returnData
        });
    });
};

exports.testCaseToCode = function(req,res){
    var db =  require('../common').getDB();
    var id = db.bson_serializer.ObjectID(req.body._id);

    db.collection('testcases', function(err, collection) {
        collection.findOne({_id:id},{},function(err,testcase){
            if(err){
                res.contentType('json');
                res.json({
                    success: false,
                    error: err
                });
            }
            else{
                if(testcase.collection.length == 0 &&  (!testcase.afterState || testcase.afterstate == "")){
                    res.contentType('json');
                    res.json({
                        success: true,
                        code: ""
                    });
                    return;
                }
                turnTestCaseToCode(testcase,req.cookies.project,function(code){
                    res.contentType('json');
                    res.json({
                        success: true,
                        code: code
                    });
                })
            }
        });
    });
};

function turnTestCaseToCode(testcase,project,callback){
    var db =  require('../common').getDB();
    var script = "";
    var actionCount = 0;

    if(testcase.type != "collection") callback("");


    var getRealAction = function(actionID,callback){
        db.collection('actions', function(err, collection) {
            collection.findOne({_id:actionID},{},function(err,action){
                if(err){
                    //tcAction.action = action;
                    callback(null)
                }
                else{
                    callback(action)
                }
                //actionCount++;
                //if(actionCount == testcase.collection.length){
                //    console.log(testcase);
                //}
            });
        });
    };

    var actionToCode = function (action,callback) {
        var paramString = "";
        action.parameters.forEach(function(parameter){
            if(parameter.paramvalue == "<NULL>") return;
            var paramItem = "";
            if(parameter.parametertype == "String" || !parameter.parametertype){
                parameter.paramvalue = parameter.paramvalue.replace(new RegExp("\\$\\{([\\s\\w_.-]+)\\}", "g" ),function(a,b){
                    var foundVar = require('../common').ArrayIndexOf(action.parent.params,function(param){
                        if(param){
                            return b === param.name;
                        }
                        else{
                            return false;
                        }
                    });

                    if(foundVar == -1){
                        return '${variables."'+b+'"}'
                    }
                    else{
                        return '${params."'+b+'"}'
                    }
                });
                parameter.paramvalue = parameter.paramvalue.replace(/\//g, '\\/');
                paramItem = parameter.paramname+"\":/"+parameter.paramvalue+"/";
            }
            else if(parameter.parametertype == "Boolean"){
                paramItem = parameter.paramname+'":'+parameter.paramvalue.toLowerCase();
            }
            else{
                paramItem = parameter.paramname+'":[';
                parameter.paramvalue.forEach(function(item,index){
                    if(index == 0){
                        paramItem += '"'+item+'"';
                    }
                    else {
                        paramItem += ',"'+item+'"';
                    }
                });
                paramItem += "]";
            }

            if(paramString == ""){
                paramString = '"'+paramItem;
            }
            else{
                paramString += ',"'+paramItem
            }
        });
        if(paramString == "") paramString = "[:]";

        var execCode = "";
        if(action.action.type == "script"){
            var lastIndex = action.action.script.lastIndexOf(".");
            execCode = "new "+action.action.script.substring(0,lastIndex)+"()"+action.action.script.substring(lastIndex,action.action.script.length);
            execCode += "("+paramString+")";
        }
        else {
            execCode = "Action"+action.actionid + "("+paramString+")";
        }

        if(action.returnvalue && action.returnvalue != ""){
            execCode +=  'variables."'+action.returnvalue+'" = ' + execCode;
        }

        if(action.executionflow == "Record Error Continue Test Case"){
            action.code = "        try{\r\n            //"+action.action.name+"\r\n           "+execCode+"\r\n         }\r\n       catch(all){println all}"
        }
        else if(action.executionflow == "Ignore Error Continue Test Case"){
            action.code = "        try{\r\n            //"+action.action.name+"\r\n            "+execCode+"\r\n        }\r\n        catch(all){}"
        }
        else{
            action.code = "        //"+action.action.name+"\r\n        " +execCode;
        }

        callback();
    };

    var collectionToCode = function(collection,parent,callback){
        var actionCount = 0;
        collection.forEach(function(tcAction){
            var id = db.bson_serializer.ObjectID(tcAction.actionid);
            getRealAction(id,function(action){
                if(action.type == "collection"){
                    tcAction.action = action;
                    tcAction.parent = parent;
                    actionToCode(tcAction,function(){
                        collectionToCode(action.collection,action,function(){
                            actionCount++;
                            if(actionCount == collection.length){
                                callback();
                            }
                        })
                    })
                }
                else{
                    actionCount++;
                    tcAction.action = action;
                    tcAction.parent = parent;
                    actionToCode(tcAction,function(){
                        if(actionCount == collection.length){
                            callback();
                        }
                    })
                }
            });
        })
    };


    var topLevelTC = "";
    var methods = "";
    var afterState = "";

    //handle afterstate
    if(testcase.afterState && testcase.afterstate != ""){
        testcase.collection.push({actionid:testcase.afterState,executionflow:"Record Error Stop Test Case",parameters:[],afterState:true})
    }
    collectionToCode(testcase.collection,testcase,function(){
        var printCode = function(collection,topLevel,callback){
            if(collection.length == 0){
                callback();
                return;
            }
            var actionCount = 0;
            collection.forEach(function(action,index){
                if(action.action.type == "collection"){
                    //console.log(action.actionid);
                    //methods["Action"+action.actionid] = "//"+action.action.name+"\r\n\tpublic static def Action"+action.actionid;
                    if(action.afterState == true){
                        afterState += action.code+"\r\n";
                    }
                    else if(topLevel ==  true){
                        //topLevelTC += "            //"+action.action.name+"\r\n";
                        topLevelTC += action.code+"\r\n";
                    }
                    else{
                        methods += "//"+action.action.name+"\r\n";
                        methods += action.code+"\r\n";
                    }
                    if(methods.indexOf(action.actionid) == -1){
                        methods += "    //"+action.action.name+"\r\n    public static def Action"+action.actionid+"(def params){\r\n";
                        printCode(action.action.collection,false,function(){
                            actionCount++;
                            if(actionCount == collection.length){
                                callback();
                            }
                        })
                    }
                    else{
                        actionCount++;
                        if(actionCount == collection.length){
                            callback();
                        }
                    }
                }
                else{
                    if(action.afterState == true){
                        afterState += action.code+"\r\n";
                    }
                    else if(topLevel ==  true){
                        topLevelTC += action.code+"\r\n";
                    }
                    else{
                        methods += action.code+"\r\n";
                        if(index == collection.length-1){
                            methods += "\r\n    }\r\n"
                        }
                    }
                    //console.log(action.code)
                    actionCount++;
                    if(actionCount == collection.length){
                        //console.log(methods)
                        callback();
                    }
                }
            })
        };

        var variablesToCode = function(variables){
            var varCode = "";
            variables.forEach(function(variable){
                var value = "null";
                if(variable.value != "<NULL>"){
                    value = variable.value;
                }
                varCode += '        variables."'+variable.name+'" = "'+ value +'"\r\n';
            });
            return varCode;
        };
        //console.log(testcase.collection);
        require("./variables").getVariables(db,{project:project},function(variables){
            printCode(testcase.collection,true,function(){
                var varCode = variablesToCode(variables);
                var resultingCode = "import org.testng.annotations.BeforeSuite\r\n"+
                        "import org.testng.annotations.AfterMethod\r\n"+
                        "import org.testng.annotations.Test\r\n\r\n"+
                        "//"+testcase.name+"\r\n"+
                        "class RedwoodHQTestCase{\r\n"+
                        "    private def variables = [:]\r\n\r\n"+
                        "    @BeforeSuite\r\n"+
                        "    public void beforeState(){\r\n"+
                        varCode+
                        "    }\r\n"+
                        "    @Test\r\n"+
                        "    public void testcase(){\r\n"+
                        topLevelTC+
                        "    }\r\n"+
                        methods+
                        "    @AfterMethod\r\n"+
                        "    public void afterState(){\r\n"+
                        afterState+
                        "    }\r\n"+
                        "}";
                callback(resultingCode);
            });
        })
    });


    //console.log(testcase);
}

function CreateTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            callback(returnData);
            SaveHistory(db,returnData[0]);
        });
    });
}

function UpdateTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.save(data,{safe:true},function(err){
            if (err) console.warn(err.message);
            else callback(err);
            SaveHistory(db,data);
        });
    });

}

exports.SaveHistory = function(db,data){SaveHistory(db,data)};

function SaveHistory(db,data){
    db.collection('testcaseshistory', function(err, collection) {
        data.testcaseID = data._id;
        delete data._id;
        data.date = new Date();
        collection.insert(data,{safe:true},function(err,returnData){
            if (err) console.warn(err.message);
        });
    });
}

function DeleteTestCases(db,data,callback){
    db.collection('testcases', function(err, collection) {
        collection.remove(data,{safe:true},function(err) {
            callback(err);
            db.collection('executiontestcases', function(err, tccollection) {
                tccollection.find({testcaseID:data._id.toString()},{},function(err,cursor) {
                    cursor.each(function(err,testcase){
                        if(testcase != null){
                            db.collection('executions', function(err, excollection) {
                                excollection.findOne({_id:testcase.executionID,locked:false},{},function(err,execution){
                                    if(execution != null){
                                        tccollection.remove({_id:testcase._id},{safe:true},function(err) {
                                            executions.updateExecutionTotals(testcase.executionID);
                                            realtime.emitMessage("RemoveExecutionTestCase",{id:testcase._id,executionID:testcase.executionID});
                                        });
                                    }
                                })
                            });
                        }
                    });
                });
            });
        });
    });

}

function GetTestCases(db,query,callback){
    var testcases = [];

    db.collection('testcases', function(err, collection) {
        collection.find(query, {}, function(err, cursor) {
            cursor.each(function(err, action) {
                if(action == null) {
                    callback(testcases);
                }
                testcases.push(action);
            });
        })
    })
}