var spawn = require('child_process').spawn;

exports.Post = function(req, res){
    res.contentType('json');
    res.json({
        success: true
    });
    spawn('Agent_RedwoodHQ_Setup.exe', ['/S'],{detached:true});
};
