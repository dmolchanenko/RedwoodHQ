var db;

exports.initDB = function(){
    var mongo = require('mongodb'),
        Server = mongo.Server,
        Db = mongo.Db;

    var dbServer = new Server('localhost', 27017, {auto_reconnect: true,safe:true});
    db = new Db('automationframework', dbServer);

    db.open(function(err, db) {
        if(!err) {
            console.log("DB connected");
        }
    });

};

exports.getDB = function(){
    return db;
};

