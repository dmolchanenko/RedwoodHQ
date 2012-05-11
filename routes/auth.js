var sessions = {};

exports.loginPage = function(req,res){
    res.redirect('/login.html');
};

exports.logIn = function (req,res,next){
    verifyUser(req.body.username,req.body.password,function(userFound){
        if (userFound){
            require('crypto').randomBytes(20, function(ex, buf) {
                var token = buf.toString('hex');
                sessions[req.body.username] = {sessionid:token,expires:new Date(Date.now() + 900000)};
                res.cookie('sessionid', token, { expires: new Date(Date.now() + 900000), httpOnly: true});
                //res.cookie('username', req.body.username, { expires: new Date(Date.now() + 900000), httpOnly: true});
                res.cookie('username', req.body.username, {maxAge: 2592000000, httpOnly: true });
                return next();
            });
        }
        else{
            res.json({error:"Invalid User Name/Password",redirect:null});
        }
    });
};

exports.logInSucess = function(req,res){
    res.json({error:null,redirect:"/index.html"});
};

exports.auth = function(req,res,next){
    if (sessions[req.cookies.username] != undefined){
        if (req.cookies.sessionid == sessions[req.cookies.username].sessionid){
            return next();
        }
    }
    res.redirect("/login");
};

function verifyUser(username,password,callback){
    var hash = require('crypto').createHmac('md5',"redwood").update(password).digest('hex');
    var app =  require('../common');
    var db = app.getDB();
    db.collection('users', function(err, collection) {
        collection.find({username:username,password:hash}).count(function(err,number){
            if (number == 0){
                callback(false);
            }
            else{
                callback(true);
            }
        });
    })
}