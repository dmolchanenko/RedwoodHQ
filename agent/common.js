var Config = {};
exports.Config = Config;
var fs = require('fs');
var path = require('path');

exports.parseConfig = function(callback){
    var conf = fs.readFileSync(path.resolve(__dirname,"../")+"/properties.conf");
    var i = 0;
    var parsed = conf.toString().split("\r\n");
    parsed.forEach(function(line){
        i++;
        if ((line.indexOf("#") != 0)&&(line.indexOf("=") != -1)){
            Config[line.split("=")[0]] = line.split("=")[1];
        }
        if(i == parsed.length){
            callback()
        }
    })
};


