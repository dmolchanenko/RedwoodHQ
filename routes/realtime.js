var io;
sio = require('socket.io');
terminal = require('../routes/terminal');
compile = require('../routes/compile');
var common = require("../common");
var users = {};
var realtime = require("./realtime");

exports.initSocket = function(app){
    io = sio.listen(app);

    io.configure( function() {
        io.set('log level', 0);
    });

    io.sockets.on('connection', function(socket) {
        //console.log(socket.id);
        socket.on("terminal",function(msg){
            terminal.operation(msg,socket.id,function(response){
                io.sockets.socket(socket.id).emit("terminal",response);
            })
        });
        socket.on("compile",function(msg){
            compile.operation(msg,socket.id,function(response){
                //console.log(response);
                io.sockets.socket(socket.id).emit("compile",response);
            })
        });

        socket.on("userConnected",function(msg){
            users[socket.id] = msg.username;
            common.getDB().collection('users', function(err, collection) {
                collection.update({username:users[socket.id]},{$set:{status:"online"}},{safe:true,multi:true},function(err,data){
                    collection.findOne({username:users[socket.id]},{},function(err,data){
                        delete data.password;
                        realtime.emitMessage("UpdateUsers",data);
                    });
                });
            });
        });

        socket.on('disconnect', function () {
            if(users[socket.id]){
                common.getDB().collection('users', function(err, collection) {
                    collection.update({username:users[socket.id]},{$set:{status:"offline"}},{safe:true,multi:true},function(){
                        collection.findOne({username:users[socket.id]},{},function(err,data){
                            if(data == null)return;
                            delete data.password;
                            realtime.emitMessage("UpdateUsers",data);
                        });
                    });
                });
            }
            terminal.closeSession(socket.id);
        });

        socket.on('AddMachines', function (msg) {
            io.sockets.emit("AddMachines",msg)
        });

        socket.on('AddActions', function (msg) {
            io.sockets.emit("AddActions",msg)
        });

        socket.on('AddTestCases', function (msg) {
            io.sockets.emit("AddTestCases",msg)
        });

        socket.on('CollaborateScript', function (msg) {
            if(msg.toUserName){
                io.sockets.emit("CollaborateScript"+msg.toUserName,msg)
            }
            if(msg.change && msg.change.returnBack === true){
                io.sockets.emit("CollaborateScript"+msg.username,msg);
                console.log(msg);
            }
        });
    });

};

exports.emitMessage = function (channel,msg){
    //console.log(channel);
    //console.log(msg);
    io.sockets.emit(channel,msg)
};