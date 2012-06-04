
exports.GitPull = function(){
    var spawn = require('child_process').spawn,
        git  = spawn('C:\\Program Files (x86)\\Git\\bin\\git.exe',['help','tag']);

    console.log('Spawned child pid: ' + git.pid);
    git.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('exit', function (code) {
        console.log('child process exited with code ' + code);
    });
    git.stdin.end();
};

