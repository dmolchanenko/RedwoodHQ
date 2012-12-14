Ext.define("Redwood.controller.RealTimeEvents", {
    extend: 'Ext.app.Controller',

    init: function () {

        //Ext.ComponentQuery.query('variablesEditor')[0];
        //Ext.socket.emit('terminal', "newTerminalSession");
    },

    startEvents: function(){
        Ext.socket.on('deleteProject',function(project){
            if (project.name == Ext.util.Cookies.get("project")){
                Ext.util.Cookies.clear("project");
                Ext.util.Cookies.clear("sessionid");
                window.location.reload(true);
            }
            else{
                var store = Ext.data.StoreManager.lookup('Projects');
                var record = store.findRecord("_id",project.id);
                store.remove(record);
                store.removed = [];
            }
        });

        Ext.socket.on('newProject',function(project){
            var store = Ext.data.StoreManager.lookup('Projects');
            if (store.find("_id",project._id) == -1){
                store.add(project);
            }
        });
    }



});