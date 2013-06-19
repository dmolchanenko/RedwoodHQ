var spawn = require('child_process').spawn;
var path = require('path');

exports.initBare = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['--bare','init'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.init = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['init'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.push = function(workdir,callback){
    console.log("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['push','origin','master'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.pull = function(workdir,callback){
    console.log("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['pull','origin','master'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.clone = function(workdir,dirToClone,callback){
    console.log("clone");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['clone',dirToClone,'.'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        if(callback) callback();
    });
};

exports.add = function(workdir,file,callback){
    console.log("add");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['add',file],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.commit = function(workdir,file,callback){
    console.log("commit");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['commit',file,'-m','auto comment'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.delete = function(workdir,callback){
    //git commit -a -m "File nonsense.txt is now removed"
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['commit','-a','-m','files/file removed'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.commits = function(workdir,file,versionInfo){

};

exports.show = function(workdir,file,versionInfo){

};


exports.getGitInfo = function (path){
    var FileName = path.slice(path.lastIndexOf("/")+1);
    var gitPath = path.slice(0,path.lastIndexOf("/"));
    //var gitPath = __dirname.replace("gitinterface","");
    //var gitPath = path.resolve(__dirname,"../");
    //gitPath = gitPath + path;
    //gitPath = gitPath.slice(0,gitPath.lastIndexOf("/"));
    return {path:gitPath,fileName:FileName}
};

