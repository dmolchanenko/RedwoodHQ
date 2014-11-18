var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var common = require('../common');
var fs = require('fs');

exports.filesInConflict = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff','--name-only','--diff-filter=U'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('filesInConflict stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.commitsSinceDate = function(workdir,date,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rev-list','--count','--since='+date,'HEAD'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('commitsSinceDate stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.lsFiles = function(workdir,query,callback){
    var params = query;
    params.unshift("-o");
    params.unshift("-c");
    params.unshift("ls-files");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),params,{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('lsFiles stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.filesNotPushed = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff','--name-only','origin/master', 'HEAD'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('filesNotPushed stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.showFileContents = function(workdir,file,version,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['show','HEAD:'+file],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('showFileContents stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.initBare = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['--bare','init'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('initBare stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.setGitUser = function(workdir,userName,eMail,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['config','user.name',userName],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('setGitUser stderr: ' + data);
    });

    git.on('close', function (code) {
        var git2  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['config','user.email',eMail],{cwd: workdir,timeout:300000});
        git2.on('close', function (code) {
            if (callback) callback();
        });
    });
};

exports.init = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['init'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('init stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.push = function(workdir,callback){
    common.logger.info("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['push','origin','master'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('push stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(code);
    });
};

exports.pull = function(workdir,callback){
    common.logger.info("pull");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','origin','master'],{cwd: workdir,timeout:300000});

    var cliOut = "";
    git.stdout.on('data', function (data) {
        cliOut = cliOut + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('pull stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliOut);
    });
};

exports.clone = function(workdir,dirToClone,callback){
    common.logger.info("clone");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['clone',dirToClone,'.'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('clone stderr: ' + data);
    });

    git.on('close', function (code) {
        if(callback) callback();
    });
};

exports.copyFiles = function(workdir,file,dest,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/cp.exe'),['-R',file,dest],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data.toString());
    });

    git.stderr.on('data', function (data) {
        common.logger.error('copy stderr: ' + data.toString());
    });

    git.on('close', function (code) {
        callback();
    });
};


exports.add = function(workdir,file,callback){
    common.logger.info("add");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['add',file],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('add stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.commit = function(workdir,file,callback){
    common.logger.info("commit");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['commit',file,'-m','auto comment'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('commit stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.rename = function(workdir,file,newName,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['mv',file,newName],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('rename stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.deleteFiles = function(workdir,file,callback){
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['commit','-a','-m','files/file removed'],{cwd: workdir,timeout:300000});
    var git = null;
    git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/rm'),['-R',file],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('deleteFiles stderr: ' + data);
    });

    git.on('close', function (code) {
        if(callback) callback();
    });
};

exports.delete = function(workdir,file,callback){
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git.exe'),['commit','-a','-m','files/file removed'],{cwd: workdir,timeout:300000});
    if (fs.existsSync(file) == false){
        if (callback)callback();
        return;
    }
    var stats = fs.lstatSync(file);
    var git = null;
    if (stats.isDirectory() == true){
        git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rm','-r',file],{cwd: workdir,timeout:300000});
    }
    else{
        git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rm','-f',file],{cwd: workdir,timeout:300000});
    }

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('delete stderr: ' + data);
    });

    git.on('close', function (code) {
        if(stats.isDirectory() == true){
            fs.exists(file,function(exists){
                if (exists == true){
                    fs.rmdir(file)
                }
            })
        }
        if(callback) callback();
    });
};

exports.commitAll = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['commit','-a','-m','auto comment'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('commit all stderr: ' + data);
    });

    git.on('exit', function (code) {
        callback();
    });
};

exports.addAll = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['add','-A'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('addAll stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.gitFetch = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['fetch'],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('gitFetch stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
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

