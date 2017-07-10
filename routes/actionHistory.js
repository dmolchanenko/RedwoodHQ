var ObjectID = require('mongodb').ObjectID;
var realtime = require("./realtime");
var actionsRoute = require("./actions");

exports.historyGet = function(req, res){
    var app =  require('../common');
    GetHistory(app.getDB(),{actionID:new ObjectID(req.params.id)},function(data){
        //remove last entry since it's a copy of current one anyway
        data.pop();
        res.contentType('json');
        res.json({
            success: true,
            actions: data
        });
    });
};

exports.historyPost = function(req, res){
    var app =  require('../common');
    GetHistory(app.getDB(),{_id:new ObjectID(req.body.id)},function(actions){
        var action = actions[0];
        delete action.date;
        action._id = action.actionID;
        delete action.actionID;
        app.getDB().collection('actions', function(err, collection) {
            collection.save(action,{safe:true},function(err){
                if (err) console.warn(err.message);
                realtime.emitMessage("UpdateActions",action);
                actionsRoute.SaveHistory(app.getDB(),action);
            });
        });
    })
};

function GetHistory(db,query,callback){
    var actions = [];
    db.collection('actionshistory', function(err, collection) {
        collection.find(query, {sort:"date"}, function(err, cursor) {
            cursor.each(function(err, action) {
                if(action == null) {
                    callback(actions);
                }
                actions.push(action);
            });
        })
    });
}