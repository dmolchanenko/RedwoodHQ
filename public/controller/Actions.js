function openAction(id){
    var store = Ext.data.StoreManager.lookup('Actions');
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#actionsBrowser"));
    var controller = Redwood.app.getController("Actions");
    controller.onEditAction(store.getById(id));
    if(!Ext.isIE){
        return false;
    }
}

Ext.define("Redwood.controller.Actions", {
    extend: 'Ext.app.Controller',

    models: ['Actions',"ActionTags",'MethodFinder'],
    stores: ['Actions',"ActionTags"],
    views:  ['Actions','ScriptPicker'],

    init: function () {
        this.control({
            'actions': {
                render: this.onActionsRender,
                newAction: this.onNewAction,
                saveAction: this.onSaveAction,
                editAction: this.onEditAction,
                deleteAction: this.onDeleteAction
            }
        });
    },

   onDeleteAction:function(){
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === undefined){
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
        //if (this.tabPanel.getComponent(record.get("name")) === undefined){
        var foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
        if (foundIndex == -1){
            var tab = Ext.create('Redwood.view.ActionView',{
                title:record.get("name"),
                closable:true,
                dataRecord:record,
                itemId:record.get("name")
            });

            this.tabPanel.add(tab);
            var foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
        }
        this.tabPanel.setActiveTab(foundIndex);
        //this.tabPanel.setActiveTab(record.get("name"));

    },

    onSaveAction: function(){
        var actionView = this.tabPanel.getActiveTab();
        if (actionView === undefined){
            return;
        }
        if (actionView.validate(this.getStore('Actions')) === false){
            return;
        }
        var action = actionView.getActionData();
        if (actionView.dataRecord === null){
            actionView.dataRecord = this.getStore('Actions').add(action)[0];
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
        }
        this.getStore('Actions').sync();
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