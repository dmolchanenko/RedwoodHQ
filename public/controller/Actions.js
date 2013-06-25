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

    onCloneAction:function(){
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
                if(me.getStore('Actions').find("name",text) != -1){
                    Ext.Msg.show({title: "Clone Error",msg:"Action name should be unique.",iconCls:'error',buttons : Ext.MessageBox.OK});
                    return;
                }
                var action = actionView.getActionData();
                action.name = text;
                var newAction = me.getStore('Actions').add(action)[0];
                me.getStore('Actions').sync({success:function(batch,options){
                    Ext.socket.emit('AddActions', batch.operations[0].records[0].data);
                }});
                me.onEditAction(newAction);
            }
        });

    },

    onDeleteAction:function(){
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === null){
            return;
        }
        if (actionView.title === "[New Action]"){
            return;
        }
        Ext.Msg.show({
            title:'Delete Confirmation',
            msg: "Are you sure you want to delete '"+ actionView.title + "' action?" ,
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id === "yes"){
                    Ext.data.StoreManager.lookup('Actions').remove(actionView.dataRecord);
                    Ext.data.StoreManager.lookup('Actions').sync({success:function(batch,options){} });
                    actionView.dirty = false;
                    actionView.close();
                }
            }
        });
    },
    onEditAction: function(record){
        var foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
        if (foundIndex == -1){
            var tab = Ext.create('Redwood.view.ActionView',{
                title:record.get("name"),
                closable:true,
                dataRecord:record,
                itemId:record.get("name")
            });

            this.tabPanel.add(tab);
            foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
            tab.down("#actionDetails").collapse();
        }
        this.tabPanel.setActiveTab(foundIndex);

    },

    onSaveAction: function(){
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === null){
            return;
        }
        if (actionView.validate(this.getStore('Actions')) === false){
            return;
        }
        var action = actionView.getActionData();
        if (actionView.dataRecord === null){
            actionView.dataRecord = this.getStore('Actions').add(action)[0];
            this.getStore('Actions').sync({success:function(batch,options){
                Ext.socket.emit('AddActions', batch.operations[0].records[0].data);
            }});
        }
        else{
            actionView.dataRecord.set("collection",action.collection);
            actionView.dataRecord.set("name",action.name);
            actionView.dataRecord.set("description",action.description);
            actionView.dataRecord.set("status",action.status);
            actionView.dataRecord.set("type",action.type);
            actionView.dataRecord.set("tag",action.tag);
            actionView.dataRecord.set("params",action.params);
            actionView.dataRecord.set("script",action.script);
            this.getStore('Actions').sync();
        }

        this.getStore('ActionTags').sync();
        actionView.setTitle(action.name);
        actionView.dirty = false;
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