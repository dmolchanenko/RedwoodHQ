var argv = require('optimist')
    .usage('Usage: $0 --name [name]')
    .demand(['name'])
    .argv;
var users = require('../routes/users');
var scripts = require('../routes/scripts');
var git = require('../gitinterface/gitcommands');
var common = require('../common');
var fs = require('fs');
var path = require('path');
var baseDir = path.resolve(__dirname,"../public/automationscripts/")+"/";
common.initLogger("cli");
process.setMaxListeners(300);
common.parseConfig(function(){
    common.initDB(common.Config.DBPort,function(){
        users.getAllUsers(function(users){
            fs.exists(baseDir + argv.name,function(exists){
                if(exists == true){
                    fs.writeFile(baseDir + argv.name +"/admin" + "/PipRequirements","",function(){
                        var gitInfo = git.getGitInfo(baseDir + argv.name +"/admin" + "/PipRequirements");
                        git.add(gitInfo.path,gitInfo.fileName,function(){
                            git.commit(gitInfo.path,gitInfo.fileName,function(){
                                git.push(gitInfo.path,function(){
                                    var count = 0;
                                    users.forEach(function(user,index){
                                        var repoPath = baseDir + argv.name + "/" + user.username;
                                        scripts.setupPython(repoPath,function(){
                                            fs.appendFile(repoPath + "/.gitignore","\r\nPythonWorkDir\r\n**/*.pyc",function(){
                                                count++;
                                                if(count == users.length){
                                                    console.log("Upgraded project: "+argv.name);
                                                    process.exit(0);
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else{
                    console.log("Unable to find project: "+argv.name);
                    process.exit(0);
                }
            });
        });
    });
});
//            process.exit(0);
