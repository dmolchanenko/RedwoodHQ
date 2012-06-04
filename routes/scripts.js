var fs = require('fs');
var rootDir = "public/automationscripts/src";

exports.scriptsGet = function(req, res){
    GetScripts(rootDir,function(data){
        res.contentType('json');
        res.json(data);
        /*
        res.json({
            success: true,
            text: "src",
            cls:"folder",
            expanded: true,
            children: data
        });*/
    });
};

function GetScripts(rootDir,callback){
    walkDir(rootDir, function(err, results) {
        if (err) throw err;
        //console.log(results);
        //console.log(results[0].children);
        callback(results);
        //callback(results);
    });
}


var walkDir = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            var result = {};
            result.text = file;
            result.fullpath = dir + '/' + file;
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    result.cls = "folder";
                    results.push(result);
                    walkDir(file, function(err, res) {
                        result.children = res;
                        //results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    //result.cls = "file";
                    result.leaf= true;
                    results.push(result);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};
