var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var common = require('common');
var appDir = path.resolve(__dirname,"../")+"/";

exports.licenseGet = function(req, res){
    fs.exists(appDir+"license/license.txt",function(exists){
        if(exists === true){
            licenseInfo(appDir+"license/license.txt",function(response){
                if (response.indexOf("LICENSE_VALID") != -1){
                    var users = response.substring(response.indexOf(":")+1,response.length);
                    res.contentType('json');
                    res.json({
                        success: true,
                        response: response,
                        licenseText:"",
                        users:users
                    });
                }
                else{
                    res.contentType('json');
                    res.json({
                        success: true,
                        response: response,
                        licenseText:"",
                        users:"Trial"
                    });
                }
            });
        }
        else{
            res.contentType('json');
            res.json({
                success: true,
                response: "LICENSE_VALID",
                users:"Trial"
            });
        }

    });

};

exports.licensePost = function(req, res){

    fs.writeFile(appDir+"license/license.tmp",req.body.licenseText,function(err){
        licenseInfo(appDir+"license/license.tmp",function(response){
            if (response.indexOf("LICENSE_VALID") != -1){
                fs.rename(appDir+"license/license.tmp",appDir+"license/license.txt");
                var users = response.substring(response.indexOf(":")+1,response.length);
                res.contentType('json');
                res.json({
                    success: true,
                    response: response,
                    users:users
                });
            }
            else{
                res.contentType('json');
                res.json({
                    success: true,
                    response: response
                });
            }

        });
    });

};


exports.numberOfUsers = function(callback){
    fs.exists(appDir+"license/license.txt",function(exists){
        if(exists === true){
            licenseInfo(appDir+"license/license.txt",function(response){
                if (response.indexOf("LICENSE_VALID") != -1){
                    var users = response.substring(response.indexOf(":")+1,response.length);
                    callback(parseInt(users));
                }
                else{
                    callback(0)
                }
            });
        }
        else{
            callback(0)
        }

    });
};


function licenseInfo(path,callback){
    //var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",'"'+appDir+'utils/lib/*'+'"'+';'+'"'+appDir+'vendor/groovy/*'+'"'+';'+'"'+appDir+'utils/'+'"'+'',"LicenseInfo",path]);
    var proc = spawn(appDir+"vendor/Java/bin/java.exe",["-cp",appDir+'utils/lib/*;'+appDir+'vendor/groovy/*;'+appDir+'utils/',"LicenseInfo",path]);
    var returnData = "";
    proc.stderr.on('data', function (data) {
        common.logger.info(data.toString());
        returnData = returnData + data.toString();
    });
    proc.stdout.on('data', function (data) {
        common.logger.info(data.toString());
        returnData = returnData + data.toString();
    });

    proc.on('close', function (data) {
        callback(returnData);
    });

}
