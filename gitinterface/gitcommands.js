var spawn = require('child_process').spawn;

exports.add = function(workdir,file,callback){

    var git  = spawn('Git/bin/git.exe',['add',file],{cwd: workdir,timeout:300000});

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

    var git  = spawn('Git/bin/git.exe',['commit',file,'-m','auto comment'],{cwd: workdir,timeout:300000});

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
    var git  = spawn('Git/bin/git.exe',['commit','-a','-m','files/file removed'],{cwd: workdir,timeout:300000});

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
    var gitPath = __dirname.replace("gitinterface","");
    gitPath = gitPath + path;
    gitPath = gitPath.slice(0,gitPath.lastIndexOf("/"));
    return {path:gitPath,fileName:FileName}
};

