Ext.define("Redwood.controller.Actions", {
    extend: 'Ext.app.Controller',

    models: ['Actions',"ActionTags"],
    stores: ['Actions',"ActionTags"],
    views:  ['Actions'],

    init: function () {
        this.control({
            'actions': {
                render: this.onActionsRender,
                newAction: this.onNewAction
            }
        });
    },

    onNewAction: function(){

        var tab = Ext.create('Redwood.view.ActionView',{
            title:"[New Action]",
            closable:true
            //itemId:"asdf"+this.tabPanel.items.length
        });

        this.tabPanel.add(tab);
        this.tabPanel.setActiveTab(tab);
    },

    onActionsRender: function(){
        this.actionsPanel = Ext.ComponentQuery.query('actions')[0];
        this.tabPanel = Ext.ComponentQuery.query('#actionstab',this.actionsPanel)[0];
    }




});