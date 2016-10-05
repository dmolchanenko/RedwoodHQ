var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var common = require('../common');
var fs = require('fs');
var gitCommands = require('./gitcommands');

exports.rebaseInteractive = function(workdir,files,comment,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rebase','-i'],{env:{REDWOODHQ_COMMITCOMMENT:comment,REDWOODHQ_GITWORKINGDIR:workdir,REDWOODHQ_FILES:files,GIT_EDITOR:'"'+process.execPath+'" "'+path.resolve(__dirname,'../gitinterface/rebaseEdit.js').replace(/\\/g, '/')+'"'},cwd: workdir,timeout:300000});
    var cliData = "";
    var handlingErrors = false;

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        handlingErrors = true;
        cliData = cliData + data.toString();
        common.logger.error('rebaseInteractive stderr: ' + cliData);
        if(cliData.toString().indexOf('Could not apply') != -1) {
            var commit = cliData.split('Could not apply ')[1].split("...")[0];
            handleRebaseConflicts(workdir, commit,function () {
                callback("");
            })
        }
        else{
            callback(cliData)
        }
    });

    git.on('close', function (code) {
        if(handlingErrors == false){
            callback(cliData);
        }
    });

};

function handleRebaseConflicts(workdir,commit,callback) {
    gitCommands.filesInCommit(workdir, commit, function (out) {
        if (out != "") {
            var files = out.split("\n",filesInConflict.match(/\n/g).length);
            var resetFiles = 0;
            files.forEach(function (file) {
                gitCommands.resetFile(workdir, file, function () {
                    resetFiles++;
                    if(resetFiles == files.length){
                        gitCommands.rebaseContinue(workdir, function (out) {
                            if(out.toString().indexOf('Could not apply') != -1) {
                                var commit = out.split('Could not apply ')[1].split("...")[0];
                                handleRebaseConflicts(workdir,commit, function () {
                                    callback();
                                })
                            }
                            else{
                                callback();
                            }
                        })
                    }
                })
            });
        }
    })
}

exports.filesInCommit = function(workdir,commit,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff-tree','--no-commit-id','--name-only','-r',commit],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('filesInConflict stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.changeOrginURL = function(workdir,newURL,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['remote','set-url','origin',newURL],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('changeOrginURL stderr: ' + data);
    });

    git.on('close', function (code) {
        if (callback) callback();
    });

};

exports.rebaseContinue = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rebase','--continue'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('rebaseContinue stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.rebase = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rebase','origin','master'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('rebase stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

//make sure HEAD is always attached
exports.attachHEAD = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['status'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('status stderr: ' + data);
    });

    git.on('close', function (code) {
        if(cliData.indexOf("HEAD detached from") != -1){
            gitCommands.createBranch(workdir,'temp',function(){
                gitCommands.pointBranchToMaster(workdir,'temp',function(){
                    gitCommands.deleteBranch(workdir,'temp',function(){
                        callback();
                    });
                })
            })
        }
        else{
            callback()
        }
    });

};

exports.pointBranchToMaster= function(workdir,name,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['checkout','-B','master',name],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('status stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};


exports.createBranch= function(workdir,name,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['checkout','-b',name],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('status stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.deleteBranch= function(workdir,name,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['branch','-d',name],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('status stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};


exports.status = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['status','-s'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('status stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.resetFile = function(workdir,file,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['reset','--',file],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('rebaseContinue stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.reset = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['reset','--hard','origin/master'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('rebaseContinue stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.rebaseAbort = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rebase','--abort'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('rebaseAbort stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.findText = function(workdir,text,patternType,caseSensitive,relativePath,callback){
    //git grep --full-name -F -n 'DIMA' --
    var args = ['grep','--full-name','--line-number',patternType,text,"--",relativePath];
    if(caseSensitive){
        args.splice(3,0,caseSensitive)
    }
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),args,{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        cliData = cliData + data.toString();
        common.logger.error('findText stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.rebaseSkip = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rebase','--skip'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('rebaseSkip stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.getParentCommit = function(workdir,commit,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['rev-list',commit+"..master",'--first-parent'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('rebase stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.acceptTheirs = function(workdir,filePath,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['checkout','--theirs',"--",filePath],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('isBinary stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });

};

exports.isBinary = function(workdir,filePath,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff-tree','-p',"4b825dc642cb6eb9a060e54bf8d69288fbee4904",'HEAD','--',filePath],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('isBinary stderr: ' + data);
    });

    git.on('close', function (code) {
        if(cliData.indexOf("Binary") == -1){
            callback(false);
        }
        else{
            callback(true);
        }
    });

};

exports.gitStatus = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['status'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('gitStatus stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.fileLogNotPushed = function(workdir,filePath,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['log','origin/master..HEAD','--simplify-merges','--reverse','--pretty=format:%H',"--",filePath],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('fileLogNotPushed stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.fileLog = function(workdir,filePath,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['log','--pretty=format:%H||%an||%ad||%s','--simplify-merges',"--",filePath],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('fileLog stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.filesInConflict = function(workdir,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff','--name-only','--diff-filter=U'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
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
    });

    git.stderr.on('data', function (data) {
        common.logger.error('commitsSinceDate stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.filesModifiedSinceDate = function(workdir,date,callback){

    var git;
    if(process.platform == "win32"){
        git = spawn(path.resolve(__dirname,'../vendor/Git/usr/bin/find'),['.','-not','-path',"'./build/*'",'-newermt',date,'-type','f'],{cwd: workdir,timeout:300000});
    }
    else{
        git = spawn('find',['.','-not','-path',"'./build/*'",'-newermt',date,'-type','f'],{cwd: workdir,timeout:300000});
    }
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
        console.log(cliData);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('filesModifiedSinceDate stderr: ' + data);
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
    });

    git.stderr.on('data', function (data) {
        common.logger.error('lsFiles stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.filesNotPushed = function(workdir,status,repo,callback){
    var statusOption = "--name-only";
    if(status == true){
        statusOption = "--name-status"
    }
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff',statusOption,repo],{cwd: workdir,timeout:300000});
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['diff','--name-only','origin/master', 'HEAD'],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
    });

    git.stderr.on('data', function (data) {
        common.logger.error('filesNotPushed stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliData);
    });

};

exports.showFileContents = function(workdir,file,version,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['show',version+':'+file],{cwd: workdir,timeout:300000});
    var cliData = "";

    git.stdout.on('data', function (data) {
        cliData = cliData + data.toString();
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

exports.addRemote = function(workdir,name,url,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['remote','add',name,url],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('addRemote stderr: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.removeRemote = function(workdir,name,callback){
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['remote','remove',name],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('removeRemote stderr: ' + data);
        callback();
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.push = function(workdir,callback){
    common.logger.info("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['push','origin','master'],{cwd: workdir,timeout:300000});
    var error = "";

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        error += data.toString();
        common.logger.error('push stderr: ' + data);
    });

    git.on('close', function (code,error) {
        callback(code);
    });
};

exports.pushSkipCommits = function(workdir,skipCommits,callback){
    common.logger.info("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['push','origin','HEAD~'+skipCommits+':master'],{cwd: workdir,timeout:300000});

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

exports.keyScan = function(workdir,hostname,callback){
    var args = [];
    if(hostname.indexOf(":") != -1){
        args.push("-p");
        args.push(hostname.split(":")[1]);
        args.push(hostname.split(":")[0]);
    }
    else{
        args.push(hostname)
    }
    var git;
    if(process.platform == "win32"){
        git = spawn(path.resolve(__dirname,'../vendor/Git/usr/bin/ssh-keyscan'),args,{cwd: workdir,env:{HOME:workdir},timeout:300000});
    }
    else{
        git = spawn('ssh-keyscan',args,{cwd: workdir,env:{HOME:workdir},timeout:300000});
    }

    var cliOut = "";

    git.stdout.on('data', function (data) {
        cliOut = cliOut + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('keyScan stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliOut);
    });
};

exports.keyGen = function(workdir,label,callback){
    var git;
    if(process.platform == "win32"){
        git = spawn(path.resolve(__dirname,'../vendor/Git/usr/bin/ssh-keygen'),["-C",label,"-t","rsa","-N","","-f",".ssh/id_rsa"],{cwd: workdir,env:{HOME:workdir},timeout:300000});
    }
    else{
        git = spawn('ssh-keygen',["-C",label,"-t","rsa","-N","","-f",".ssh/id_rsa"],{cwd: workdir,env:{HOME:workdir},timeout:300000});
    }

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('keyGen stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(code);
    });
};

exports.pushDryRun = function(workdir,callback){
    common.logger.info("push");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['push','origin','master','--dry-run'],{cwd: workdir,timeout:300000});

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

exports.pushRemote = function(workdir,repoName,branch,callback){
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','--rebase','origin','master'],{env:{GIT_EDITOR:'"'+process.execPath+'" "'+path.resolve(__dirname,'../gitinterface/echoEdit.js').replace(/\\/g, '/')+'"'},cwd: workdir,timeout:300000});
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['push',repoName,branch],{env:{HOME:workdir},cwd: workdir,timeout:300000});

    var cliOut = "";
    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        cliOut = cliOut + data.toString();
        common.logger.error('pushRemote stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(code,cliOut);
    });
};

exports.pullRemote = function(workdir,repoName,branch,callback){
    common.logger.info("pull");
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','--rebase','origin','master'],{env:{GIT_EDITOR:'"'+process.execPath+'" "'+path.resolve(__dirname,'../gitinterface/echoEdit.js').replace(/\\/g, '/')+'"'},cwd: workdir,timeout:300000});
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','--no-edit',repoName,branch],{env:{HOME:workdir},cwd: workdir,timeout:300000});

    var cliOut = "";
    git.stdout.on('data', function (data) {
        cliOut = cliOut + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        cliOut = cliOut + data.toString();
        if(cliOut.indexOf("Couldn't find remote ref") != -1){
            //git.stdin.write('y\n');

        }
        common.logger.error('pull stderr: ' + data);
    });

    git.on('close', function (code) {
        callback(cliOut);
    });
};

exports.pull = function(workdir,callback){
    common.logger.info("pull");
    //var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','--rebase','origin','master'],{env:{GIT_EDITOR:'"'+process.execPath+'" "'+path.resolve(__dirname,'../gitinterface/echoEdit.js').replace(/\\/g, '/')+'"'},cwd: workdir,timeout:300000});
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['pull','origin','master'],{env:{GIT_EDITOR:'"'+process.execPath+'" "'+path.resolve(__dirname,'../gitinterface/echoEdit.js').replace(/\\/g, '/')+'"'},cwd: workdir,timeout:300000});

    var cliOut = "";
    git.stdout.on('data', function (data) {
        cliOut = cliOut + data.toString();
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        cliOut = cliOut + data.toString();
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
    var git;
    if(process.platform == "win32"){
        git = spawn(path.resolve(__dirname,'../vendor/Git/bin/cp.exe'),['-R',file,dest],{cwd: workdir,timeout:300000});
    }
    else{
        git = spawn('cp',['-R',file,dest],{cwd: workdir,timeout:300000});
    }

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

exports.commitForMerge = function(workdir,file,message,callback){
    common.logger.info("commitForMerge");
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),['commit','-i',file,'-m',message],{cwd: workdir,timeout:300000});

    git.stdout.on('data', function (data) {
        common.logger.info('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        common.logger.error('commit commitForMerge: ' + data);
    });

    git.on('close', function (code) {
        callback();
    });
};

exports.commit = function(workdir,file,message,callback){
    common.logger.info("commit");
    var arguments = ["commit"];
    if(Array.isArray(file)){
        arguments = arguments.concat(file);
    }
    else{
        arguments.push(file)
    }
    arguments.push("-m");
    arguments.push(message);
    var git  = spawn(path.resolve(__dirname,'../vendor/Git/bin/git'),arguments,{cwd: workdir,timeout:300000});

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
    var git;
    if(process.platform == "win32"){
        git = spawn(path.resolve(__dirname,'../vendor/Git/usr/bin/rm'),['-R',file],{cwd: workdir,timeout:300000});
    }
    else{
        git = spawn('rm',['-R',file],{cwd: workdir,timeout:300000});
    }

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

