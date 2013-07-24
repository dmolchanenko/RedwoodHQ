var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

exports.filesInConflict = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['diff','--name-only','--diff-filter=U'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.filesNotPushed = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['diff','--name-only','origin/master', 'HEAD'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.showFileContents = function(workdir,file,version,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['show','HEAD:'+file],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

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

exports.setGitUser = function(workdir,userName,eMail,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['config','user.name',userName],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        var git2  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['config','user.email',eMail],{cwd: workdir,timeout:300000});
        git2.on('exit', function (code) {
            if (callback) callback();
        });
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

exports.delete = function(workdir,file,callback){
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['commit','-a','-m','files/file removed'],{cwd: workdir,timeout:300000});
    if (fs.existsSync(file) == false){
        callback();
        return;
    }
    var stats = fs.lstatSync(file);
    var git = null;
    if (stats.isDirectory() == true){
        git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['rm','-r',file],{cwd: workdir,timeout:300000});
    }
    else{
        git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['rm','-f',file],{cwd: workdir,timeout:300000});
    }

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

exports.getGitInfo = function (path){
    var FileName = path.slice(path.lastIndexOf("/")+1);
    var gitPath = path.slice(0,path.lastIndexOf("/"));
    //var gitPath = __dirname.replace("gitinterface","");
    //var gitPath = path.resolve(__dirname,"../");
    //gitPath = gitPath + path;
    //gitPath = gitPath.slice(0,gitPath.lastIndexOf("/"));
    return {path:gitPath,fileName:FileName}
};

