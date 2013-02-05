var spawn = require('child_process').spawn;
var terminals = {};

exports.operation = function(msg, id,callback){
    if (msg=="newTerminalSession"){
        if (terminals[id] != undefined){
            terminals[id].proc.kill();
        }
        terminals[id] = {proc:spawn('vendor/Git/bin/sh.exe',['--login', '-i'])};
        terminals[id].proc.stdout.on('data', function(data) {
            callback(data.toString());
        });
        terminals[id].proc.on('exit', function(data){
            delete terminals[id];
        });
        callback("");
    }
    else if (msg == "close"){
        if (terminals[id] != undefined){
            terminals[id].proc.kill();
            delete terminals[id];
        }
    }
    else{
        if (terminals[id] != undefined){
            terminals[id].proc.stdin.write(msg.command+'\n');
            if (msg.command != "pwd"){
                terminals[id].proc.stdin.write('pwd\n');
            }
        }
        else{
            callback("terminal session terminated.\n");
        }
    }
};

exports.closeSession = function(id){
    if (terminals[id] != undefined){
        terminals[id].proc.kill();
        delete terminals[id];
    }
};