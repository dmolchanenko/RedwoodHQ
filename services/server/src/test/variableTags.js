var common = require('../common');
var spawn = require('child_process').spawn;

//var shell = spawn("dir",[], { stdio: ['pipe', null, null, null, 'pipe'] });
var shell = spawn("cmd");
//shell.stdout.pipe(process.stdout);
shell.stdout.on('data', function(data) {
    console.log(data.toString());
    //var str = data.toString(), lines = str.split(/(\r?\n)/g);
    //for (var i=0; i<lines.length; i++) {
    //    console.log(lines[i]);
    //}
});

setTimeout(function() {
    console.log('Sending stdin to terminal');
    shell.stdin.write('dir\n');
    shell.stdin.write("ping -t 127.0.0.1\n");

}, 1000);

setTimeout(function() {
    //shell.stdin.write('\x1A');
    //shell.stdin.write(String.fromCharCode(3));
    shell.stdin.write('^C');
    //shell.stdin.end();
},4000);





exports.testWalk = function(){
    common.walkDir("c:/temp",function(file){
        console.log(file);
    })
};