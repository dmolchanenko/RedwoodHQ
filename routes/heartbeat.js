var realtime = require('./realtime');
var common = require('../common');
var http = require("http");
var fs = require('fs');
var path = require('path');
var updatingAgents = {};

exports.heartbeatPost = function(req, res){
    var app =  require('../common');
    var data = req.body;
    var ip = req.connection.remoteAddress;

    findMachine(app.getDB(),data,ip,function(machine){
        if (machine == null){
            createMachine(app.getDB(),{roles:["Default"],host:ip,vncport:data.vncPort,machineVars:[],port:data.port,maxThreads:1,description:"host name is:"+data.hostname,macAddress:data.macAddress})
        }
        else{
            if (machine.macAddress){
                if((machine.host != data.hostname) && (machine.host != ip)){
                    updateMachine(app.getDB(),machine._id,{$set:{host:ip,vncport:data.vncPort,port:data.port,macAddress:data.macAddress}})
                }
                else{
                    updateMachine(app.getDB(),machine._id,{$set:{vncport:data.vncPort,port:data.port}})
                }
            }
            else{
                updateMachine(app.getDB(),machine._id,{$set:{macAddress:data.macAddress,vncport:data.vncPort,port:data.port}})
            }
            //see if we need to update the agent
            if(data.agentVersion){
                var localVersion = parseInt(app.Config.AgentVersion.replace(/\./g,''));
                var agentVersion = parseInt(data.agentVersion.replace(/\./g,''));
                if(agentVersion < localVersion){
                    if(!updatingAgents[ip]){
                        updateMachine(app.getDB(),machine._id,{$set:{macAddress:data.macAddress,vncport:data.vncPort,port:data.port,state:"Updating"}});
                        updatingAgents[ip] = ip;
                        sendFileToAgent(path.resolve(__dirname,"../public/agentsetup/")+"/Agent_RedwoodHQ_Setup.exe","Agent_RedwoodHQ_Setup.exe",ip,data.port,4,function(){
                            sendUpdateRequest(ip,data.port,4,function(){

                            })
                        })
                    }
                }
                else if(machine.state === "Updating"){
                    updateMachine(app.getDB(),machine._id,{$set:{macAddress:data.macAddress,vncport:data.vncPort,port:data.port,state:""}});
                    if(updatingAgents[ip]){
                        delete updatingAgents[ip];
                    }
                }
            }
        }

    });

    res.contentType('json');
    res.json({
        success: true
    });
};

exports.initHeartBeat = function(machine){
    var db = app.getDB();

    db.collection('machines', function(err, collection) {
        collection.find({}, {}, function(err, cursor) {
            cursor.each(function(err, machine) {
                if(machine == null) {
                    callback(machines);
                }
                machines.push(machine);
            });
        })
    })
};

function findMachine(db,data,ip,callback){
    var query = {macAddress:data.macAddress};

    db.collection('machines', function(err, collection) {
        collection.findOne(query, {}, function(err, machine) {
            if (machine != null){
                callback(machine);
            }
            else{
                query = {host:{$in:[data.hostname,ip]}};
                collection.findOne(query, {}, function(err, machine) {
                        callback(machine);
                });
            }
        })
    })
}


function updateMachine(db,id,query,callback){
    db.collection('machines', function(err, collection) {
        collection.findAndModify({_id:id},{},query,{safe:true,new:true},function(err,data){
            if (data != null) realtime.emitMessage("UpdateMachines",data);
            if (err) console.warn(err.message);
            else if(callback) callback(err);
        });
    });
}

function createMachine(db,data,callback){
    db.collection('machines', function(err, collection) {
        data._id = db.bson_serializer.ObjectID(data._id);
        collection.insert(data, {safe:true},function(err,returnData){
            if (returnData != null) realtime.emitMessage("AddMachines",returnData);
            if (callback) callback(returnData);
        });
    });
}

function sendUpdateRequest(agentHost,port,retryCount,callback){

    var options = {
        hostname: agentHost,
        port: port,
        path: '/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {

        });
    });

    req.on('error', function(e) {
        if(retryCount <= 0){
            if (callback) callback("Unable to connect to machine: "+agentHost + " error: " + e.message);
            common.logger.error('sendUpdateRequest problem with request: ' + e.message+ ' ');
        }
        else{
            retryCount--;
            sendUpdateRequest(agentHost,port,retryCount,callback)
        }
    });

    // write data to request body
    req.write(JSON.stringify({}));
    req.end();
}


function sendFileToAgent(file,dest,agentHost,port,retryCount,callback){
    var stat = fs.statSync(file);

    var readStream = fs.createReadStream(file);
    var boundary = '--------------------------';
    for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
    }

    var message =  '------' + boundary + '\r\n'
        + 'Content-Disposition: form-data; name="file"; filename="'+dest+'"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
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
            if (callback) callback();
        });
    });

    req.on('error', function(e) {
        if(retryCount <= 0){
            if (callback) callback();
            common.logger.error('sendFileToAgent problem with request: ' + e.message+ ' file:'+file);
        }
        else{
            retryCount--;
            sendFileToAgent(file,dest,agentHost,port,retryCount,callback);
        }
    });

    req.write(message);
    readStream.pipe(req, { end: false });
    readStream.on("end", function(){
        req.end('\r\n------' + boundary + '--\r\n');
    });
}

