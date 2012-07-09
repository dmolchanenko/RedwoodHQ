var db;
var fs = require('fs');

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


exports.walkDir = function(dir, done,fileCallback) {
    dirWalker(dir,done,fileCallback)
};

function dirWalker(dir, done,fileCallback) {
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null);
        list.forEach(function(file) {
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                fileCallback(file);
                if (stat && stat.isDirectory()) {
                    dirWalker(file, function(err, res) {
                        if (!--pending) done(null);
                    },fileCallback);
                } else {
                    if (!--pending) done(null);
                }
            });
        });
    });
};



