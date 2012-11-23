var adminStore = Ext.create('Ext.data.TreeStore', {
    root: {
        expanded: true,
        children: [
            { text: "Variables", leaf: true },
            { text: "Machines", leaf: true,icon:"images/pc.png" },
            { text: "Users", leaf: true,icon:"images/user_go.png" }
        ]
    }
});

Ext.define('Redwood.view.Viewport', {
    extend: 'Ext.container.Viewport',

    //layout: 'fit',
    layout: 'border',
    style: {height:"100%"},
    items: [
        {
            xtype:"box",
            region:"north",
            height: "22px",
            html: '<h1 class="x-panel-header" style="color:#110dff">     Redwood HQ</h1>',
            border: false
        },
        {
        xtype: 'tabpanel',
        region:"center",
        //anchor: '100%',
        //height:"300px",
        //title: 'Redwood Automation Framework',
        items: [
            {
                title: "Tasks"
            },
            {
                title: "Test Cases"
            },
            {
                xtype: "actions"
            },
            {
                xtype: 'scriptBrowser'
            },
            {

                xtype: 'panel',
                layout: 'border',
                title: 'Settings',
                itemId: "adminTab",

                items: [
                    {
                        region: 'west',
                        split:true,
                        xtype: 'treepanel',
                        collapseDirection: "left",
                        collapsible: true,
                        multiSelect: false,
                        rootVisible: false,
                        store: adminStore,
                        width: 150,
                        focused: true,
                        listeners:{
                            itemclick: function(me,record,item,index,evt,eOpts){
                                me.up("#adminTab").down("tabpanel").setActiveTab(record.get("text"));
                            }
                        }
                    },
                    {
                        xtype:"tabpanel",
                        region: "center",
                        autoScroll: true,
                        listeners:{
                            afterrender: function(me){
                                me.tabBar.setVisible(false);
                                me.setActiveTab("Variables");
                            }
                        },
                        items:[
                            {
                                xtype: "variablesEditor",
                                itemId: "Variables"
                            },
                            {
                                xtype: "machinesEditor",
                                itemId: "Machines"
                            },
                            {
                                xtype: "usersEditor",
                                itemId: "Users"
                            }

                        ]
                    }
                ],

                listeners:{
                    afterrender: function(me){
                        var treePanel = me.down("treepanel");
                        treePanel.getSelectionModel().select(treePanel.getRootNode().getChildAt(0));
                    }
                }
            }
        ]
    }]


});