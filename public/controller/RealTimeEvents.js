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

        Ext.socket.on('UpdateExecutions',function(execution){
            var store = Ext.data.StoreManager.lookup("Executions");
            if (store == null) return;
            me.updateStore(store,execution);
        });

        Ext.socket.on('UpdateResult',function(result){
            var controller = Redwood.app.getController("Executions");
            var foundTab = controller.tabPanel.down("#"+result._id);
            if (foundTab){
                foundTab.refreshResult(result);
            }
        });

        Ext.socket.on('UpdateMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.updateStore(store,machine);
        });

        Ext.socket.on('AddMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.addToStore(store,machine);
        });

        Ext.socket.on('DeleteMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.removeFromStore(store,machine);
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
        if(!record) return;
        for(var propt in item){
            if (propt != "_id"){
                record.set(propt,item[propt]);
            }
        }
        store.fireEvent("beforesync",{update:[record]});
        record.dirty = false;
    },

    removeFromStore: function(store,item){
        var record = store.findRecord("_id",item.id);
        store.remove(record);
        store.fireEvent("beforesync",{destroy:[record]});
        store.removed = [];
    },

    addToStore: function(store,item){
        if (store.find("_id",item._id) == -1){
            var items = store.add(item);
            store.fireEvent("beforesync",{create:items});
            items[0].phantom = false;
        }
    }



});