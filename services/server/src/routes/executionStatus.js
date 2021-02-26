
exports.executionStatusGet = function(req, res){
    var app =  require('../common');
    var id = req.params.id;
    GetExecutionStatus(app.getDB(),{_id:id},function(data){
        res.contentType('json');
        res.json({
            success: true,
            execution: data
        });
    });
};

function GetExecutionStatus(db,query,callback){
    db.collection('executions', function(err, collection) {
        collection.find(query, {status:1}, function(err, cursor) {
            var done = false;
            cursor.each(function(err, execution) {
                if((execution != null)&&(done == false)) {
                    done = true;
                    callback(execution);
                }
                else if((execution == null) &&(done == false)){
                    callback(execution);
                }
            });
        })
    })
}