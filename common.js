var logger = {};
exports.logger = logger;
var db;
var fs = require('fs');
var winston = require('winston');
var Config = {};
exports.Config = Config;
var spawn = require('child_process').spawn;
var MSBuildLocation = null;
exports.MSBuildLocation = MSBuildLocation;
var common = require("./common");
var walk = require("walk");

exports.parseConfig = function(callback){
    var conf = fs.readFileSync(__dirname+"/properties.conf");
    var i = 0;
    var parsed;
    if(conf.toString().indexOf("\r\n") != -1){
        parsed = conf.toString().split("\r\n");
    }
    else{
        parsed = conf.toString().split("\n");
    }

    parsed.forEach(function(line){
        line = line.replace("\r","");
        i++;
        if ((line.indexOf("#") != 0)&&(line.indexOf("=") != -1)){
            Config[line.split("=")[0]] = line.split("=")[1];
        }
        if(i == parsed.length){
            callback()
        }
    });

    //find .NET location
    setNETLocation(function(){
    });
};

exports.setNETLocation = function(callback){setNETLocation(callback)};

function setNETLocation(callback){
    fs.exists("c:/windows/Microsoft.NET/Framework",function(exists){
        if(exists == true){
            if(process.env.SYSTEMROOT){
                fs.readdir(process.env.SYSTEMROOT+"/Microsoft.NET/Framework",function(err,files){
                    files.forEach(function(file,index){
                        if(file.indexOf("v4.0") != -1){
                            common.MSBuildLocation = process.env.SYSTEMROOT+"/Microsoft.NET/Framework/"+file+"/MSBuild.exe";
                        }
                        if(index == files.length - 1){
                            callback()
                        }
                    });
                })
            }
            else{
                callback()
            }
        }
        else{
            callback()
        }
    });
}

exports.initLogger = function(fileName){
    var winTransports = [
        new (winston.transports.File)({ filename: 'logs/'+fileName+'.log',maxsize:10485760,maxFiles:10,timestamp:true })
    ];

    if(process.platform == "win32"){
        winTransports.push(new (winston.transports.Console)());
    }
    this.logger = new (winston.Logger)({
        transports:winTransports
        //transports: [
        //    new (winston.transports.Console)(),
        //    new (winston.transports.File)({ filename: 'logs/'+fileName+'.log',maxsize:10485760,maxFiles:10,timestamp:true })
        //]
    });
    this.logger.handleExceptions(new winston.transports.File({ filename: 'logs/'+fileName+'_errors.log' }));
    this.logger.exitOnError = false;
};

exports.initDB = function(port,callback){
    var mongo = require('mongodb'),
        Server = mongo.Server,
        Db = mongo.Db;

    var dbRetry = 420;
    var connect = function(){
        var dbServer = new Server('localhost', parseInt(port), {poolSize :100,auto_reconnect: true,safe:true});
        db = new Db('automationframework', dbServer);
        db.open(function(err, db) {
            if(!err) {
                if (callback) callback();
                console.log("DB connected");
            }
            else{
                if(dbRetry == 0){
                    console.error("Couldn't connect to MongoDB", err.message);
                    process.exit(1);
                }
                dbRetry--;
                setTimeout(connect,1000);
            }
        });
    };
    connect()

};

exports.getDB = function(){
    return db;
};

exports.uniqueId = function()
{
    var newDate = new Date;
    var partOne = newDate.getTime();
    var partTwo = 1 + Math.floor((Math.random()*32767));
    var partThree = 1 + Math.floor((Math.random()*32767));
    var id = partOne + '-' + partTwo + '-' + partThree;
    return id;
};

exports.ArrayIndexOf = function(a, fnc) {
    if (!fnc || typeof (fnc) != 'function') {
        return -1;
    }
    if (!a || !a.length || a.length < 1) return -1;
    for (var i = 0; i < a.length; i++) {
        if (fnc(a[i])) return i;
    }
    return -1;
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
}

exports.cleanUpExecutions = function(){
    db.collection('hosts', function(err, collection) {
        var hosts = [];
        collection.find({}, {}, function(err, cursor) {
            cursor.each(function(err, host) {
                if(host == null) {
                    var appDir = __dirname+"/";
                    //console.log(appDir+"vendor/Java/bin/java "+"-cp "+appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/* '+"com.primatest.cloud.Main \""+JSON.stringify({operation:"capacityValidation",hosts:hosts,totalInstances:totalInstances}).replace(/"/g,'\\"')+'"');
                    var proc = spawn(appDir+"vendor/Java/bin/java",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/*',"com.primatest.cloud.Main",JSON.stringify({operation:"unlockALLVMs",hosts:hosts})]);
                    proc.stderr.on('data', function (data) {
                        //logger.error('Cloud stderr: ' + data.toString());
                    });
                }
                hosts.push(host);
            });
        })
    });


    db.collection('machines', function(err, collection) {
        collection.update({},{$set:{state:"",takenThreads:0}},{multi:true});
    });
    db.collection('executiontestcases', function(err, collection) {
        collection.update({"status":"Running"},{$set:{status:"Not Run","result":"",resultID:null,error:"",trace:"",startdate:"",enddate:"",runtime:""}},{multi:true,safe:true},function(err){
        });
    });
    db.collection('executions', function(err, collection) {
        collection.update({"status":"Running"},{$set:{status:"Ready To Run"}},{multi:true,safe:true},function(err){
        });
    });
};

exports.cleanUpUserStatus = function(callback){
    db.collection('users', function(err, collection) {
        collection.update({},{$set:{status:""}},{multi:true},function(){
            callback();
        });
    });
};


exports.deleteDir = function(dir,callback){
    var walker = walk.walkSync(dir);

    var errors = "";
    var allDirs = [];
    if(fs.existsSync(dir) == false){
        if(callback) callback()
    }
    walker.on("file", function (root, fileStats, next) {
        try{
            fs.unlinkSync(root+"/"+fileStats.name);
        }
        catch(err) {
            errors += "Unable to delete file: "+root+"/"+fileStats.name;
        }
    });

    walker.on("directories", function (root, dirs, next) {
        dirs.forEach(function(dir){
            allDirs.push(root+"/"+dir.name);
        });
        next();
    });
    walker.on("end", function () {
        //res.send("{error:null,success:true}");
        allDirs.reverse();
        if(errors == ""){
            allDirs.forEach(function(dirCount){
                try{
                    fs.rmdirSync(dirCount);
                }
                catch(err){
                    errors += "dir "+ dirCount +" is not empty";
                    console.log("dir "+ dirCount +" is not empty")
                }

            });
            try{
                fs.rmdirSync(dir);
            }
            catch(err){
                errors += "dir "+ dir +" is not empty";
                console.log("dir "+ dir +" is not empty")
            }
        }

        if(callback) {
            if(errors != ""){
                callback(errors)
            }
            else{
                callback();
            }
        }
    });

};

exports.deleteDir_old = function(dir,callback){
    var walker = walk.walkSync(dir);

    var allDirs = [];
    walker.on("file", function (root, fileStats, next) {
        fs.unlinkSync(root+"/"+fileStats.name);
    });

    walker.on("directories", function (root, dirs, next) {
        dirs.forEach(function(dir){
            allDirs.push(root+"/"+dir.name);
        });
        next();
    });
    walker.on("end", function () {
        //res.send("{error:null,success:true}");
        allDirs.reverse();
        allDirs.forEach(function(dirCount){
            try{
                fs.rmdirSync(dirCount);
            }
            catch(err){
                logger.info("dir "+ dirCount +" is not empty")
            }

        });
        try{
            fs.rmdirSync(dir);
        }
        catch(err){
            logger.info("dir "+ dir +" is not empty")
        }

        if(callback) callback();
    });

};



