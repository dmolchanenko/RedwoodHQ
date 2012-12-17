var fs = require('fs');
var rootDir = "public/automationscripts/";

exports.methodFinderPost = function(req,res){
    var path = "";
    if(req.params.id == "root"){
        path = rootDir+req.cookies.project;
    }
    else{
        path = rootDir+req.cookies.project+"/"+req.params.id;
    }

    fs.readdir(path, function(err, list) {
        //if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            var result = {};
            result.text = file;
            result.fullpath = dir + '/' + file;
            file = dir + '/' + file;

        });
    });
};