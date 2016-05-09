var path = require('path');
var archiver = require('archiver');
var common = require('../common');
var fs = require('fs');
var http = require("http");
var os = require('os');
var multiparty = require('multiparty');
var AdmZip = require('adm-zip');
var git = require('../gitinterface/gitcommands');

exports.syncToRedwoodHQ = function(req,res){
    var ip = req.connection.remoteAddress;
    var port = 5009;
    var project = req.cookies.project;
    var username = req.cookies.username;

    var options = {
        hostname: ip,
        port: port,
        path: '/idesync',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var sendreq = http.request(options, function(agentres) {
        agentres.setEncoding('utf8');
        agentres.on('data', function (chunk) {
            git.addAll(path.resolve(__dirname,"../public/automationscripts/"+project+"/"+username),function(){
                try{
                    var msg = JSON.parse(chunk);
                }
                catch(err){
                    res.json({success:true,error:err});
                }

                if((msg )&&(msg.error != null)){
                    res.json({success:true,error:msg.error});
                }
                else{
                    res.json({success:true,message:msg});
                }
            });
        });
    });

    sendreq.on('error', function(e) {
        if(e.code = "ECONNREFUSED"){
            res.json({success:true,error:"Unable to connect to agent. <br>Please make sure you have <b>RedwoodHQ Agent</b> installed and running on your machine."});
        }
        else{
            res.json({success:true,error: e.message});
        }
    });

    sendreq.write(JSON.stringify({project:project,username:username}));
    sendreq.end();
};

exports.sourcesFromAgent = function(req,res){
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        if (err) {
            res.json({error:err});
            fs.unlink(tmp_path);
            return;
        }
        var project = req.cookies.project;
        var username = req.cookies.username;
        var tmp_path = files.file[0].path;
        var extractTo = path.resolve(__dirname,"../public/automationscripts/"+project+"/"+username);
        var target_path = extractTo+"/"+files.file[0].originalFilename;
        fs.rename(tmp_path,target_path, function(err) {
            if (err) {
                res.json({error:err});
                fs.unlink(tmp_path);
                return;
            }

            var zip = new AdmZip(target_path);
            common.deleteDir(extractTo+"/src",function(err){
                if(err){
                    res.json({success:true,error:err});
                    return;
                }
                common.deleteDir(extractTo+"/bin",function(err){
                    if(err){
                        res.json({success:true,error:err});
                        return;
                    }
                    common.deleteDir(extractTo+"/External Libraries",function(err){
                        if(err){
                            res.json({success:true,error:err});
                            return;
                        }
                        zip.extractAllTo(extractTo, true);
                        fs.unlink(target_path);
                        fs.unlink(tmp_path);
                        res.json({success:true});
                    });
                });
            });
        });
    });
    //res.send('{}');
};

exports.syncToIDE = function(req,res){
    var project = req.cookies.project;
    var username = req.cookies.username;
    var ip = req.connection.remoteAddress;
    var sourceDir = path.join(__dirname, '../public/automationscripts/'+project+"/"+username);
    var launcherPath = path.join(__dirname, '../launcher/RedwoodHQLauncher.jar');
    var destPath = os.tmpDir()+"/"+username+"idesync.zip";
    var port = 5009;

    zipSources(sourceDir,destPath,launcherPath, function (err) {
        if(err){
            res.json({success:true,error:err});
            return;
        }
        sendSourcesToAgent(destPath,"idesync/"+project+"/"+username+"/"+username+"idesync.zip",ip,port,function(message){
            fs.unlink(destPath);
            res.contentType('json');
            if(message && message.error){
                if(message.error.indexOf("ECONNREFUSED") != -1){
                    res.json({success:true,error:"Unable to connect to agent. <br>Please make sure you have <b>RedwoodHQ Agent</b> installed and running on your machine."});
                }
                else{
                    res.json({success:true,error:message.error});
                }
            }
            else {
                res.json({success:true});
            }
        })
    });

};

function sendSourcesToAgent(file,dest,agentHost,port,callback){

    try{
        var stat = fs.statSync(file);

        var readStream = fs.createReadStream(file);
    }
    catch(e){
        if (callback) callback({error: "Can't read file: " + file + " " + e.message});
        return;
    }

    var boundary = '--------------------------';
    for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
    }

    var message =  '------' + boundary + '\r\n'
            // use your file's mime type here, if known
        + 'Content-Disposition: form-data; name="file"; filename="'+dest+'"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
            // "name" is the name of the form field
            // "filename" is the name of the original file
        + 'Content-Transfer-Encoding: binary\r\n\r\n';



    var options = {
        hostname: agentHost,
        port: port,
        path: '/fileupload',
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data; boundary=----'+boundary,
            'Content-Length': stat.size + message.length + boundary.length + 14
        }
    };

    var req = http.request(options, function(res) {
        res.on('data', function (chunk) {
            if (callback) callback(JSON.parse(chunk));
        });
        res.on('close', function(){
            readStream.end();
            readStream.destroy.bind(readStream);
        });
    });


    var handleError = function(e){
        readStream.end();
        readStream.destroy.bind(readStream);
        if (callback) callback({error:'sendFileToAgent problem with request: ' + e.message+ ' file:'+file});
    };
    req.setTimeout(300000, function(){
        handleError({message:"Unable to connect to machine: "+agentHost + " CONNECTION TIMEOUT"});
        this.end();
    });
    req.on('error', function(e) {
        handleError(e);
        this.end();
    });

    req.write(message);
    readStream.on("error",function(e){
        this.end();
        handleError(e);
    }).pipe(req, { end: false });

    readStream.on("end", function(){
        try{
            req.end('\r\n------' + boundary + '--\r\n');
        }
        catch(e){
            readStream.end();
        }
    });
}


function zipSources(sourceDir,destPath,launcherPath,callback){
    var output = fs.createWriteStream(destPath);
    var archive = archiver('zip');

    output.on('close', function () {
        output.end();
        callback();
    });

    archive.on('error', function(err){
        callback(err);
        common.logger.error(err);
        output.end();
    });

    archive.pipe(output);
    archive.bulk([
        { expand: true, cwd: sourceDir, src: ['**','!**.pyc','!**/*.pyc','!.git','!build','!build/**','!PythonWorkDir','!PythonWorkDir/**','!PipRequirements']}
    ]);
    archive.append(fs.createReadStream(launcherPath), { name: 'External Libraries/RedwoodHQLauncher.jar' });
    archive.finalize();
}