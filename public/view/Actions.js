var newAction = Ext.create('Ext.Action', {
    icon: 'images/page_add.png',
    text: 'New Action',
    itemId: "newAction",
    tooltip: "New Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        //if (editor == undefined){
        //    editor = this.up('#treeContext').scriptEditor;
        //}
        editor.fireEvent('newAction');
    }
});

var saveAction = Ext.create('Ext.Action', {
    icon: "images/save.gif",
    tooltip: "Save Selected Action",
    handler: function(widget, event) {
    }
});

Ext.define('Redwood.view.Actions', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.actions',
    id: "actionsBrowser",
    title: "Actions",
    layout: 'border',

    initComponent: function () {

        this.items=[
            {
                region: 'west',
                split:true,
                xtype: 'grid',
                collapseDirection: "left",
                collapsible: true,
                multiSelect: false,
                id:"actionsGrid",
                store: Ext.data.StoreManager.lookup('Actions'),
                width: 206,
                title: "Actions",
                focused: false,
                hideHeaders: true,
                columns: [
                {
                    //header: 'Actions',
                    dataIndex: 'name',
                    width: 200
                }
                ],
                tbar: {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            width: 200,
                            //fieldLabel: 'Search',
                            //labelWidth: 50,
                            xtype: 'searchfield',
                            paramNames: ["tag","name"],
                            store: Ext.data.StoreManager.lookup('Actions')
                        }
                        ]

                }
            },
            {
                xtype:"tabpanel",
                region: 'center',
                itemId: 'actionstab',
                defaults:{ autoScroll:true },
                plugins: [
                    Ext.create('Ext.ux.TabCloseMenu', {

                    }),
                    Ext.create('Ext.ux.TabReorderer', {

                    })
                ]
            }
        ];
        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',
            items:[
                newAction,
                saveAction
            ]
        };
        this.callParent(arguments);
    }
});

