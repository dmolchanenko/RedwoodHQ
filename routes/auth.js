var sessions = {};
var projects =  require('../routes/projects');
var userState =  require('../routes/userStates');
var realtime = require("./realtime");
var common = require('../common');

exports.loginPage = function(req,res){
    res.redirect('/login.html');
};

exports.loadSessions = function(){
    var app =  require('../common');
    var db = app.getDB();
    db.collection('sessions', function(err, collection) {
        collection.find({}, {}, function(err, cursor) {
            cursor.each(function(err, session) {
                if(session != null) {
                    sessions[session.username] = {sessionid:session.sessionid,expires:session.expires};
                }
            });
        })
    })
};

exports.logIn = function (req,res,next){
    verifyUser(req.body.username,req.body.password,function(userFound,user){
        console.log(user);
        //common.logger.info("projects",user.projects[0]);
        if (userFound){
            require('crypto').randomBytes(20, function(ex, buf) {
                realtime.emitMessage("Login",req.body.username);
                var token = buf.toString('hex');
                console.log("role:", user.role);
                common.logger.info("login projects", user.projects);
                sessions[req.body.username] = {sessionid:token,expires:new Date(Date.now() + 2592000000),role:user.role, userId:user._id, projects:user.projects};
                storeSession(req.body.username,token,new Date(Date.now() + 2592000000));
                res.cookie('sessionid', token, { expires: new Date(Date.now() + 2592000000), httpOnly: false});
                res.cookie('username', req.body.username, {maxAge: 2592000000, httpOnly: false });
                res.cookie('role', user.role, {maxAge: 2592000000, httpOnly: false });
                res.cookie('userId', user._id, {maxAge: 2592000000, httpOnly: false });
                if (user.role !== 'Admin') {
                    res.cookie('projects', user.projects, {maxAge: 2592000000, httpOnly: false });
                    res.cookie('userDefaultProject', user.projects[0], {maxAge: 2592000000, httpOnly: false });
                }
                return next();

            });
        }
        else{
            res.json({error:"Invalid User Name/Password",redirect:null});
        }
    });
};

function logInSucess(req,res){
    userState.GetUserProject(req.cookies.username,function(project){
        console.log("######################################");
        console.log(res);
        var roleField = res.get("set-cookie")[2].split(";");
        var userRole = roleField[0].split("=")[1];

        if(userRole !== 'Admin') {
            var projectField = res.get("set-cookie")[5].split(";");
            var defaultProjectID = projectField[0].split("=")[1];
        }
        //common.logger.info("cookie projects string", defaultProjectID);
        //common.logger.info("cookie userRole string", userRole);
        //common.logger.info("cookie projects", res.get("set-cookie")[3].indexOf("="));
        //common.logger.info("cookie projects length", res.get("set-cookie")[3].length);
        //common.logger.info("cookie projects typeod", typeof res.get("set-cookie")[3]);
        //common.logger.info("user projects", req.cookies.projects[0]);
        //common.logger.info("resp project", project);
        //common.logger.info("cookie project",req.cookies.project);
        //var userDefaultProject = req.cookies.projects[0];
        if(req.cookies.deeplink){
            common.logger.info("at if logic");
            res.clearCookie('deeplink');
            common.logger.info("resp project", project);
            projects.allProjects(function(projects){
                if(userRole !== "Admin") {
                    projects.forEach(function(project){
                        common.logger.info("project name if logic", project._id.toString());
                        if (project._id.toString() == defaultProjectID){
                            res.cookie('project', project.name, {maxAge: 2592000000, httpOnly: false });
                        }
                    });
                } else {
                    res.cookie('project', projects[0].name, {maxAge: 2592000000, httpOnly: false });
                }
                if(req.originalUrl != "/index.html"){
                    res.json({error:null,redirect:"./index.html"});
                }
                else{
                    res.json({error:null,redirect:"./index.html"});
                }
            });
        }
        else if ((project == null) || (req.cookies.project === undefined) || (req.cookies.project == "")){
            common.logger.info("at else logic");
            projects.allProjects(function(projects){
                var found = false;
                if(userRole !== "Admin") {
                    projects.forEach(function(project){
                        if (project._id.toString() == defaultProjectID){
                            found = true;
                            res.cookie('project', project.name, {maxAge: 2592000000, httpOnly: false });
                        }
                    });
                } else {
                    res.cookie('project', projects[0].name, {maxAge: 2592000000, httpOnly: false });
                }

                res.json({error:null,redirect:"./index.html"});
            });
        }
    })
}
exports.logInSucess = function(req,res){
    logInSucess(req,res)
};

exports.auth = function(req,res,next){
    //common.logger.info("Original url", req.originalUrl);
    if (sessions[req.cookies.username] != undefined){
        if (req.cookies.sessionid == sessions[req.cookies.username].sessionid){
            if (req.cookies.project == undefined){
                if(req.originalUrl == "/index.html"){
                    common.logger.info("Original url", req.originalUrl);
                    res.cookie('deeplink', req.originalUrl, {maxAge: 2592000000, httpOnly: false });
                    return next();
                }
                else{
                    common.logger.info("Original url", req.originalUrl);
                    logInSucess(req,res);
                    return;
                }
            }
            else{
                return next();
            }
        }
    }
    if(req.originalUrl != "/index.html"){
        res.cookie('deeplink', req.originalUrl, {maxAge: 2592000000, httpOnly: false });
    }
    return res.redirect("/login");
};

function storeSession(username,sessionid,expires){
    var app =  require('../common');
    var db = app.getDB();
    db.collection('sessions', function(err, collection) {
        collection.save({username:username,sessionid:sessionid,expires:expires},{safe:true},function(err){
            if (err) console.warn(err.message);
        });
    });
}

function storeProject(username,project,expires){
    var app =  require('../common');
    var db = app.getDB();
    db.collection('users', function(err, collection) {
        collection.findAndModify({username:username},{},{$set:{selectedProject:project}},{safe:true,new:false},function(err,data){
            if (err) console.warn(err.message);
        });
    });
}

function verifyUser(username,password,callback){
    var hash = require('crypto').createHmac('md5',"redwood").update(password).digest('hex');
    var app =  require('../common');
    var db = app.getDB();
    db.collection('users', function(err, collection) {
        collection.findOne({username:username,password:hash},function(err,user){
            if (user == null){
                callback(false,null);
            }
            else{
                callback(true,user);
            }
        });
    })
}
