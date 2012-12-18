var adminStore = Ext.create('Ext.data.TreeStore', {
    root: {
        expanded: true,
        children: [
            { text: "Variables", leaf: true },
            { text: "Machines", leaf: true,icon:"images/pc.png" },
            { text: "Users", leaf: true,icon:"images/user_go.png" },
            { text: "Projects", leaf: true,icon:"images/project.png" }
        ]
    }
});

Ext.define('Redwood.view.Viewport', {
    extend: 'Ext.container.Viewport',

    layout: 'border',
    style: {height:"100%"},
    listeners:{
        afterrender: function(me){
            me.insert(0,{
                xtype:"panel",
                region:"north",
                height: "22px",
                bodyStyle: { background: '#A5A5A5'},
                tbar: {
                    xtype: 'toolbar',
                    style: { background: '#A5A5A5'},
                    dock: 'top',
                    items:[
                        {
                            xtype:"box",
                            html: '<h1 class="x-panel-header" style="color:#110dff">     Redwood HQ</h1>'
                        },
                        "->",
                        {
                            xtype:"combo",
                            store: Ext.data.StoreManager.lookup('Projects'),
                            queryMode: 'local',
                            displayField: 'name',
                            valueField: 'name',
                            itemID: "projectSelection",
                            fieldLabel:"Choose Project",
                            labelStyle: "font-weight: bold",
                            width: 250,
                            forceSelection: true,
                            editable: false,
                            listeners:{
                                afterrender: function(me){
                                    var project = Ext.util.Cookies.get("project");
                                    me.getStore().on("load",function(store,records){
                                        me.internalSelect = true;
                                        records.forEach(function(record){
                                            if (record.get("name") === project){
                                                me.setValue(record);
                                            }
                                        });
                                        me.internalSelect = false;
                                    });
                                    //me.setValue(me.getStore().findRecord("name",projectName).get("_id"));

                                },
                                change: function(me,value,oldValue){
                                    //return;
                                    if ( me.internalSelect === true) return;
                                    Ext.Msg.show({
                                        title:'Project Change Confirmation',
                                        msg: 'Are you sure you want to change project?<br>Please note that all unsaved changes will be lost.',
                                        buttons: Ext.Msg.YESNO,
                                        icon: Ext.Msg.QUESTION,
                                        fn: function(id){
                                            if (id == "yes"){
                                                Ext.util.Cookies.set("project",value);
                                                window.location.reload(true);
                                            }
                                            else{
                                                me.internalSelect = true;
                                                me.setValue(oldValue);
                                                me.internalSelect = false;
                                            }
                                        }
                                    });


                                }
                            }
                        }
                    ]

                }
            });
        }
    },
    items: [
        {
        xtype: 'tabpanel',
        region: "center",
        ui: "blue-tab",
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
                            ,
                            {
                                xtype: "projectsEditor",
                                itemId: "Projects"
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