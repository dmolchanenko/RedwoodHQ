function openAction(id){
    var store = Ext.data.StoreManager.lookup('Actions');
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#actionsBrowser"));
    var controller = Redwood.app.getController("Actions");
    controller.onEditAction(store.getById(id));
    if(Ext.isChrome){
        return false;
    }
}

function openActionHistory(actionID,historyID){
    var store = Ext.data.StoreManager.lookup('ActionHistoryStore'+actionID);
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#actionsBrowser"));
    var controller = Redwood.app.getController("Actions");
    var record = store.query("_id",historyID).get(0);
    //flag this as a history test case
    record.set("history",true);
    controller.onEditAction(record);
    if(Ext.isChrome){
        return false;
    }
}

Ext.define("Redwood.controller.Actions", {
    extend: 'Ext.app.Controller',

    models: ['Actions',"ActionTags",'MethodFinder'],
    stores: ['Actions',"ActionTags","ActionsTree"],
    views:  ['Actions','ScriptPicker','ActionPicker'],

    init: function () {
        this.control({
            'actions': {
                render: this.onActionsRender,
                newAction: this.onNewAction,
                saveAction: this.onSaveAction,
                editAction: this.onEditAction,
                deleteAction: this.onDeleteAction,
                cloneAction: this.onCloneAction
            }
        });
    },

    onRevert: function(historyID){
        Ext.Ajax.request({
            url:"/actionhistory",
            method:"POST",
            jsonData : {id:historyID},
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.error){
                    Ext.Msg.alert('Error', obj.error);
                }
            }
        });
    },

    onCloneAction:function(){
        if(Ext.util.Cookies.get('role') == "Test Designer") return;
        var actionView = this.tabPanel.getActiveTab();
        var me = this;
        if (actionView === null){
            return;
        }
        if (actionView.dirty === true){
            Ext.Msg.show({title: "Clone Error",msg:"Please save any changes before cloning selected action.",iconCls:'error',buttons : Ext.MessageBox.OK});
            return;
        }

        Ext.Msg.prompt('Name', 'Please enter new action name:', function(btn, text){
            if (btn == 'ok'){
                var record = me.getStore('Actions').query("name",text,false,true,true).getAt(0);
                if(record){
                    Ext.Msg.show({title: "Clone Error",msg:"Action name should be unique.",iconCls:'error',buttons : Ext.MessageBox.OK});
                    return;
                }
                var action = actionView.getActionData();
                action.name = text;
                var newAction = me.getStore('Actions').add(action)[0];
                me.getStore('Actions').sync({success:function(batch,options){
                    var actionData = batch.operations[0].records[0].data;
                    actionData.project = Ext.util.Cookies.get('project');
                    Ext.socket.emit('AddActions', actionData);
                }});
                me.onEditAction(newAction,false);
            }
        });

    },

    onDeleteAction:function(){
        if(Ext.util.Cookies.get('role') == "Test Designer") return;
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === null){
            return;
        }
        if (actionView.title === "[New Action]"){
            return;
        }
        if(Ext.util.Cookies.get('role') == "Test Designer"){
            Ext.Msg.show({title: "Error",msg:"Test Designer cannot delete actions.",iconCls:'error',buttons : Ext.MessageBox.OK});
            return;
        }
        Ext.Msg.show({
            title:'Delete Confirmation',
            msg: "Are you sure you want to delete <b>'"+ actionView.title + "'</b> action?" ,
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id === "yes"){
                    var testcases = Ext.data.StoreManager.lookup('TestCases').queryBy(function(record){
                        for(var i=0;i<record.get("collection").length;i++){
                            if(record.get("collection")[i].actionid == actionView.dataRecord.get("_id")){
                                return true;
                            }
                        }
                        return false;
                    });

                    var actions = Ext.data.StoreManager.lookup('Actions').queryBy(function(record){
                        for(var i=0;i<record.get("collection").length;i++){
                            if(record.get("collection")[i].actionid == actionView.dataRecord.get("_id")){
                                return true;
                            }
                        }
                        return false;
                    });

                    if(testcases.getCount() > 0){
                        Ext.Msg.show({
                            title: 'Delete Confirmation',
                            msg: "This action is used in <b>"+testcases.getCount()+"</b> test cases. Please remove it from all test cases before deleting it.",
                            buttons: Ext.Msg.OK,
                            icon: Ext.Msg.ERROR
                        });
                    }
                    else if(actions.getCount() > 0){
                        Ext.Msg.show({
                            title: 'Delete Confirmation',
                            msg: "This action is used in <b>"+actions.getCount()+"</b> actions. Please remove it from all actions before deleting it.",
                            buttons: Ext.Msg.OK,
                            icon: Ext.Msg.ERROR
                        });
                    }
                    else{
                        Ext.data.StoreManager.lookup('Actions').remove(actionView.dataRecord);
                        Ext.data.StoreManager.lookup('Actions').sync({success:function(batch,options){} });
                        actionView.dirty = false;
                        actionView.close();
                    }
                }
            }
        });
    },
    onEditAction: function(record,collapse){
        var me = this;
        var name = record.get("name");
        if(record.get("history") == true){
            name = "[HISTORY " + Ext.Date.format(record.get("date"),"m/d h:i:s") + "] "+name;
        }

        var foundIndex = this.tabPanel.items.findIndexBy(function(item) {
            return item.itemId === name;
        });
        if (foundIndex == -1){
            //foundIndex = this.tabPanel.items.findIndex("title",new RegExp("^"+record.get("name")+"\\*$"),0,false,true);
            foundIndex = this.tabPanel.items.findIndexBy(function(item,key){
                if(key == name){
                    return true;
                }
                else{
                    return false;
                }
            });
        }
        if (foundIndex == -1){
            Ext.Ajax.request({
                    url: "/action/" + record.get("_id"),
                    method: "GET",
                    success: function (response) {
                        var obj = Ext.decode(response.responseText);
                        if (obj.error) {
                            Ext.Msg.alert('Error', obj.error);
                        }
                        else {
                            record.set("name",obj.action.name);
                            record.set("description",obj.action.description);
                            record.set("status",obj.action.status);
                            record.set("type",obj.action.type);
                            record.set("tag",obj.action.tag);
                            record.set("params",obj.action.params);
                            record.set("script",obj.action.script);
                            record.set("scriptLang",obj.action.scriptLang);
                            if(obj.action.collection){
                                record.set("collection",obj.action.collection);
                            }
                            record.dirty = false;

                            var tab = Ext.create('Redwood.view.ActionView',{
                                title:name,
                                closable:true,
                                dataRecord:record,
                                itemId:name
                            });

                            me.tabPanel.add(tab);
                            foundIndex = me.tabPanel.items.findIndexBy(function(item,key){
                                if(key == name){
                                    return true;
                                }
                                else{
                                    return false;
                                }
                            });
                            if(!collapse == false){
                                tab.down("#actionDetails").collapse();
                            }
                            me.tabPanel.setActiveTab(foundIndex);
                        }
                    }
                }
            );
        }
        else {
            this.tabPanel.setActiveTab(foundIndex);
        }

    },

    onSaveAction: function(){
        if(Ext.util.Cookies.get('role') == "Test Designer") return;
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === null){
            return;
        }
        if (actionView.validate(this.getStore('Actions')) === false){
            return;
        }
        var lastScrollPos = actionView.getEl().dom.children[0].scrollTop;
        var action = actionView.getActionData();
        if (actionView.dataRecord === null){
            actionView.dataRecord = this.getStore('Actions').add(action)[0];
            this.getStore('Actions').sync({success:function(batch,options){
                var actionData = batch.operations[0].records[0].data;
                actionData.project = Ext.util.Cookies.get('project');
                Ext.socket.emit('AddActions', actionData);
                actionView.down("actioncollection").parentActionID = batch.operations[0].records[0].data._id;
                window.history.replaceState("", "", '/index.html?action='+actionView.dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
            }});
        }
        else{
            if(action.collection){
                actionView.dataRecord.set("collection",action.collection);
            }
            actionView.dataRecord.set("name",action.name);
            actionView.dataRecord.set("description",action.description);
            actionView.dataRecord.set("status",action.status);
            actionView.dataRecord.set("type",action.type);
            actionView.dataRecord.set("tag",action.tag);
            actionView.dataRecord.set("params",action.params);
            actionView.dataRecord.set("script",action.script);
            actionView.dataRecord.set("scriptLang",action.scriptLang);
            actionView.dataRecord.dirty = true;
            this.getStore('Actions').sync();
        }

        this.getStore('ActionTags').sync();
        actionView.setTitle(action.name);
        actionView.dirty = false;
        actionView.getEl().dom.children[0].scrollTop = lastScrollPos;
    },

    onNewAction: function(){
        var tab = Ext.create('Redwood.view.ActionView',{
            title:"[New Action]",
            closable:true
        });

        this.tabPanel.add(tab);
        this.tabPanel.setActiveTab(tab);
        tab.down("#name").focus();
    },

    onActionsRender: function(){
        this.actionsPanel = Ext.ComponentQuery.query('actions')[0];
        this.tabPanel = Ext.ComponentQuery.query('#actionstab',this.actionsPanel)[0];

    }




});