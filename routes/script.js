var fs = require('fs');

exports.scriptGet = function(req, res){
    GetScript(req.body.path,function(data){
        res.contentType('json');
        res.json({text:data});

    });
};

exports.scriptPut = function(req, res){
    UpdateScript(req.body.path,req.body.text,function(){
        res.json({error:null});
        //res.send();
        //res.contentType('json');
        //res.json({text:data});
    });
};

function UpdateScript(path,data,callback){
    fs.writeFile(path,data,'utf8',function(err){
        if (err) throw err;
        //console.log(data);
        callback();
    })
}

function GetScript(path,callback){
    fs.readFile(path, 'utf8' ,function (err, data) {
        if (err) throw err;
        //console.log(data);
        callback(data);
    });
}
