exports.Get = function(req, res){
    var app =  require('../common');
    var db = app.getDB();

    db.collection('emailsettings', function(err, collection) {
        collection.findOne({}, {}, function(err, settings) {
            if(settings == null){
                res.contentType('json');
                res.json({});
            }
            else{
                if (settings.password) settings.password = "**********************";
                res.contentType('json');
                res.json(settings);
            }
        })
    })

};

exports.Post = function(req, res){
    var app =  require('../common');
    var db = app.getDB();
    var data = req.body;
    db.collection('emailsettings', function(err, collection) {
        collection.findOne({}, {}, function(err, settings) {
            if(settings == null){
                collection.insert(data,{safe:true},function(err,returnData){
                    res.contentType('json');
                    res.json({success:true});
                })
            }
            else{
                data._id = settings._id;
                if (data.password == "**********************") data.password = settings.password;
                collection.save(data,{safe:true},function(err){
                    res.contentType('json');
                    res.json({success:true});
                });
            }
        });
    });
};