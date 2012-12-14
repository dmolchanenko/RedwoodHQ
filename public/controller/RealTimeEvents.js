Ext.define("Redwood.controller.RealTimeEvents", {
    extend: 'Ext.app.Controller',

    init: function () {

        //Ext.ComponentQuery.query('variablesEditor')[0];
        //Ext.socket.emit('terminal', "newTerminalSession");
    },

    startEvents: function(){
        Ext.socket.on('projectDelete',function(projectName){
            console.log(projectName);
            if (projectName == Ext.util.Cookies.get("project")){
                Ext.util.Cookies.clear("project");
                Ext.util.Cookies.clear("sessionid");
                window.location.reload(true);
            }
        });

        Ext.socket.on('newProject',function(project){
            Ext.data.StoreManager.lookup('Projects')
        });
    }



});