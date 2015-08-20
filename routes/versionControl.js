var git = require('../gitinterface/gitcommands');
var path = require('path');
var rootDir = path.resolve(__dirname,"../public/automationscripts/")+"/";


exports.getLocalVersionHistory = function(req, res){
    var workingDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    var gitPath = req.body.path.replace(workingDir+"/","");

    getLogsForFile(gitPath,workingDir,function(localHistory){
        getLogsForFile(gitPath,rootDir+req.cookies.project+"/master.git",function(masterHistory){
            localHistory.forEach(function(localVersion){
                for(var i =0;i<masterHistory.length;i++){
                    if(masterHistory[i].version == localVersion.version){
                        localVersion.masterMatch = true;
                        break;
                    }
                    else{
                        localVersion.masterMatch = false;
                    }
                }
            });
            res.json({history:localHistory});
        });
    })
};

exports.getVersionDiff = function(req,res){
    var workingDir = rootDir+req.cookies.project+"/"+req.cookies.username;
    var response = {};
    var gitPath = req.body.path.replace(workingDir+"/","");
    git.showFileContents(workingDir,gitPath,req.body.version,function(data){
        response.prevVersion = data;
        git.showFileContents(workingDir,gitPath,"HEAD",function(data){
            response.currentVersion = data;
            res.json(response);
        });
    })
};

function getLogsForFile(path,workingDir,callback){
    git.fileLog(workingDir,path,function(data){
        var history = [];
        if ((data != "")){
            var splitHistory = data.split("\n");
            splitHistory.forEach(function(line){
                var splitLine = line.split("||");
                history.push({version:splitLine[0],author:splitLine[1],date:splitLine[2],commitMessage:splitLine[3]});
            })
        }
        callback(history);
    });
}