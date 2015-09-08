var fs = require("fs");
var git = require("./gitcommands");

var files = process.env.REDWOODHQ_FILES.split("|");
var workingDir = process.env.REDWOODHQ_GITWORKINGDIR;
var comment = process.env.REDWOODHQ_COMMITCOMMENT;


if(process.argv[2].indexOf("git-rebase-todo") != -1){
    fs.readFile(process.argv[2], 'utf8', function(err, data) {
        if (err) throw err;
        console.log(data);
        var commits = [];
        var splitFile = data.split("\n");

        var finalString = "";

        splitFile.forEach(function(line){
            if(line.indexOf("#") != 0 && line != ""){
                commits.push(line)
            }
        });

        getSortedCommits(files,commits,function(sortedCommits){


            sortedCommits.forEach(function(commit){
                for(var i=0;i<commits.length;i++){
                    if(commit.indexOf(commits[i].split(" ")[1]) != -1){
                        commits.splice(i,1);
                        i--;
                        return;
                    }
                }
            });
            var notToPushCommits = commits.length;
            commits = sortedCommits.concat(commits);
            commits.forEach(function(commit){
                finalString = finalString + commit + "\n";
            });
            console.log(finalString);
            fs.writeFile(process.argv[2],finalString,function(){
                console.log("|||"+notToPushCommits+"|||");
            })
        });
    });
}
else if(process.argv[2].indexOf("COMMIT_EDITMSG") != -1){
    fs.writeFile(process.argv[2],comment,function(){
    })
}


function getSortedCommits(files,toRebaseCommits,callback){
    var sortedCommits = [];
    var count = 0;
    files.forEach(function(file){
        notPushedCommits(workingDir,file,function(commits){
            //make sure only commits to rebase are included
            var i;
            var found = false;
            for(i=0;i<commits.length;i++){
                for(var i2=0;i2<toRebaseCommits.length;i2++){
                    if(commits[i].indexOf(toRebaseCommits[i2].split(" ")[1]) != -1){
                        found = true;
                        break;
                    }
                }
                if (found == false){
                    commits.splice(i,1);
                    i--;
                }
            }

            count++;
            sortedCommits = sortedCommits.concat(commits);
            if(count == files.length){
                console.log(sortedCommits);
                if(sortedCommits.length == 1){
                    sortedCommits[0] = "reword " + sortedCommits[0] + " auto comment"
                }
                else{
                    for(i =0;i<sortedCommits.length;i++){
                        if(i == 0){
                            sortedCommits[i] = "pick " + sortedCommits[i] + " auto comment"
                        }
                        else{
                            sortedCommits[i] = "squash " + sortedCommits[i] + " auto comment"
                        }
                    }
                }
                callback(sortedCommits);
            }
        });
    });
}


function notPushedCommits(workingDir,file,callback){
    git.fileLogNotPushed(workingDir,file,function(data){
        var history = [];
        if ((data != "")){
            var splitHistory = data.split("\n");
            splitHistory.forEach(function(line,index){
                history.push(line);
            })
        }
        callback(history);
    })

}