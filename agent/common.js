var Config = {};
exports.Config = Config;
var fs = require('fs');
var path = require('path');
var http = require("http");

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

exports.sendFileToServer = function(file,id,url,host,port,cookie,callback){
    if(fs.existsSync(file) == false) {
        if (callback) callback();
        return;
    }
    var stat = fs.statSync(file);

    var readStream = fs.createReadStream(file);
    var boundary = '--------------------------';
    for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
    }

    var message =  '------' + boundary + '\r\n'
        // use your file's mime type here, if known
        + 'Content-Disposition: form-data; name="file"; filename="'+id+'"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
        // "name" is the name of the form field
        // "filename" is the name of the original file
        + 'Content-Transfer-Encoding: binary\r\n\r\n';



    var options = {
        hostname: host,
        port: port,
        path: url,
        //path: '/screenshots',
        method: 'POST',
        headers: {
            'Cookie': cookie,
            //'Content-Type': 'text/plain'//,
            'Content-Type': 'multipart/form-data; boundary=----'+boundary,
            //'Content-Disposition': 'form-data; name="file"; filename="ProjectName.jar"',
            //'Content-Length': 3360
            //'Content-Length': stat.size + message.length + 30 + boundary.length
            'Content-Length': stat.size + message.length + boundary.length + 14
        }
    };

    var req = http.request(options, function(res) {
        //res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log(chunk.toString());
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        console.log('sendFileToServer problem with request: ' + e.message+ ' file:'+file);
    });

    req.write(message);
    readStream.pipe(req, { end: false });
    readStream.on("end", function(){
        req.end('\r\n------' + boundary + '--\r\n');
    });
};

