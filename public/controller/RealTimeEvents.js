Ext.define("Redwood.controller.RealTimeEvents", {
    extend: 'Ext.app.Controller',

    init: function () {

        //Ext.ComponentQuery.query('variablesEditor')[0];
        //Ext.socket.emit('terminal', "newTerminalSession");
    },

    startEvents: function(){
        var me = this;
        Ext.socket.on('deleteProject',function(project){
            if (project.name == Ext.util.Cookies.get("project")){
                Ext.util.Cookies.clear("project");
                Ext.util.Cookies.clear("sessionid");
                window.location.reload(true);
            }
            else{
                me.removeFromStore(Ext.data.StoreManager.lookup('Projects'),project);
            }
        });

        Ext.socket.on('newProject',function(project){
            me.addToStore(Ext.data.StoreManager.lookup('Projects'),project);
        });

        Ext.socket.on('UpdateExecutionTestCase',function(testCase){
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;
            me.updateStore(store,testCase);
        });

        Ext.socket.on('RemoveExecutionTestCase',function(testCase){
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;
            if (testCase instanceof Array){
                testCase.forEach(function(item){
                    me.removeFromStore(store,item);
                });
            }
            else{
                me.removeFromStore(store,testCase);
            }
        });

        Ext.socket.on('AddExecutionTestCase',function(testCase){
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;
            if (testCase instanceof Array){
                testCase.forEach(function(item){
                    me.addToStore(store,item);
                });
            }
            else{
                me.addToStore(store,testCase);
            }
        });
    },

    updateStore: function(store,item){
        var record = store.findRecord("_id", item._id);
        for(var propt in item){
            if (propt != "_id"){
                record.set(propt,item[propt]);
            }
        }
        record.dirty = false;
    },

    removeFromStore: function(store,item){
        var record = store.findRecord("_id",item.id);
        store.remove(record);
        store.removed = [];
    },

    addToStore: function(store,item){
        if (store.find("_id",item._id) == -1){
            var items = store.add(item);
            item[0].phantom = false;
        }
    }



});