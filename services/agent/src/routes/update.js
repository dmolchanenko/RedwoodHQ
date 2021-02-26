var spawn = require('child_process').spawn;
var common = require('../common');

exports.Post = function(req, res){
    res.contentType('json');
    res.json({
        success: true
    });
    updateAgent(5);
};

function updateAgent(retryCount){
    var updateProc = spawn('Agent_RedwoodHQ_Setup.exe', ['/S'],{detached:true});
    updateProc.stdout.on('data', function (data) {
        //cliData = cliData + data.toString();
    });

    updateProc.stderr.on('data', function (data) {
    });

    updateProc.on('close', function (code) {
        if(code != 0){
            //retry
            if(retryCount <= 0){
                common.logger.error('unable to update agent error: ');
            }
            else{
                retryCount--;
                setTimeout(updateAgent(retryCount),30000)
            }
        }
    });
}
