var io;
sio = require('socket.io');
terminal = require('../routes/terminal');
compile = require('../routes/compile');

exports.initSocket = function(app){
    io = sio.listen(app);

    io.configure( function() {
        io.set('log level', 0);
    });

    io.sockets.on('connection', function(socket) {
        console.log(socket.id);
        socket.on("terminal",function(msg){
            terminal.operation(msg,socket.id,function(response){
                io.sockets.socket(socket.id).emit("terminal",response);
            })
        });
        socket.on("compile",function(msg){
            compile.operation(msg,socket.id,function(response){
                console.log(response);
                io.sockets.socket(socket.id).emit("compile",response);
            })
        });
        socket.on('disconnect', function () {
            terminal.closeSession(socket.id);
        });

        socket.on('AddMachines', function (msg) {
            io.sockets.emit("AddMachines",msg)
        });
    });

};

exports.emitMessage = function (channel,msg){
    console.log(channel);
    console.log(msg);
    io.sockets.emit(channel,msg)
};