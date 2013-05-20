var sessions = {};
var projects =  require('../routes/projects');
var userState =  require('../routes/userStates');
var realtime = require("./realtime");

exports.loginPage = function(req,res){
    res.redirect('/login.html');
};

exports.logIn = function (req,res,next){
    verifyUser(req.body.username,req.body.password,function(userFound){
        if (userFound){
            require('crypto').randomBytes(20, function(ex, buf) {
                realtime.emitMessage("Login",req.body.username);
                var token = buf.toString('hex');
                sessions[req.body.username] = {sessionid:token,expires:new Date(Date.now() + 2592000000)};
                res.cookie('sessionid', token, { expires: new Date(Date.now() + 2592000000), httpOnly: false});
                res.cookie('username', req.body.username, {maxAge: 2592000000, httpOnly: false });
                return next();
            });
        }
        else{
            res.json({error:"Invalid User Name/Password",redirect:null});
        }
    });
};

exports.logInSucess = function(req,res){
    userState.GetUserProject(req.cookies.username,function(project){
        if ((project == null) && ((req.cookies.project === undefined)||(req.cookies.project == "") )){
            projects.allProjects(function(projects){
                res.cookie('project', projects[0].name, {maxAge: 2592000000, httpOnly: false });
                res.json({error:null,redirect:"./index.html"});
            });
        }
        else if (project == null){
            projects.allProjects(function(projects){
                var found = false;
                projects.forEach(function(project){
                    if (project.name === req.cookies.project){
                        found = true;
                    }
                });
                if (found == false){
                    res.cookie('project', projects[0].name, {maxAge: 2592000000, httpOnly: false });
                }
                res.json({error:null,redirect:"./index.html"});
            });
        }
        else{
            if ((req.cookies.project === undefined)||(req.cookies.project == "")){
                res.cookie('project', project, {maxAge: 2592000000, httpOnly: false });
            }
            res.json({error:null,redirect:"./index.html"});
        }
    })
};

exports.auth = function(req,res,next){
    if (sessions[req.cookies.username] != undefined){
        if (req.cookies.sessionid == sessions[req.cookies.username].sessionid){
            if (req.cookies.project == undefined){
                res.redirect("/login");
            }
            else{
                return next();
            }
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