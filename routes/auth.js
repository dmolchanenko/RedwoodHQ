var sessions = {};

exports.logIn = function (req,res,next){
    require('crypto').randomBytes(20, function(ex, buf) {
        var token = buf.toString('hex');
        sessions[req.body.username] = {sid:token};
        res.cookie('SESSIONID', token, { expires: new Date(Date.now() + 900000), httpOnly: true });
        res.cookie('USERNAME', req.body.username, { expires: new Date(Date.now() + 900000), httpOnly: true });
        return next();
    });
}