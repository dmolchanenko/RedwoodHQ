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
        var editor = this.up('actions');
        editor.fireEvent('saveAction');
    }
});

var deleteAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    text: 'Delete',
    itemId: "deleteAction",
    tooltip: "Delete Selected Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        editor.fireEvent('deleteAction');
    }
});

var cloneAction = Ext.create('Ext.Action', {
    icon: 'images/clone.png',
    //text: 'Delete',
    itemId: "cloneAction",
    tooltip: "Clone Selected Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        editor.fireEvent('cloneAction');
    }
});

function formatAction(val,metaData,record) {
     return '<img src="images/action.png" align="top"> '+val;
     //return '<img src="images/action.png"><span>' + val + '</span>';
}

Ext.define('Redwood.view.Actions', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.actions',
    id: "actionsBrowser",
    title: "Actions",
    layout: 'border',

    initComponent: function () {

        var actionListFlat = {
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
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    enableDrag: true,
                    enableDrop: false,
                    ddGroup: "actionDrop"
                    //dragGroup: 'firstGridDDGroup',
                    //dropGroup: 'secondGridDDGroup'
                },
                markDirty: false
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    me.up('actions').fireEvent('editAction',record);
                }
            },
            columns: [
                {
                    //header: 'Actions',
                    dataIndex: 'name',
                    flex: 1,
                    renderer: formatAction
                    //width: 200
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
        };

        var actionListTree = {
            xtype: 'grid',
            multiSelect: false,
            id:"actionsTreeGrid",
            store: Ext.data.StoreManager.lookup('ActionsTree'),
            width: 206,
            title: "Actions Tree",
            focused: false,
            hideHeaders: true,
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    enableDrag: true,
                    enableDrop: false,
                    ddGroup: "actionDrop"
                }
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    me.up('actions').fireEvent('editAction',record);
                }
            },
            columns: [
                {
                    dataIndex: 'name',
                    flex: 1,
                    renderer: formatAction
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
        };


        this.items=[
            actionListFlat,
            {
                xtype:"panel",
                region:"center",
                layout: "fit",
                //autoScroll:true,
                tbar: {
                    xtype: 'toolbar',
                    dock: 'top',
                    items:[
                        newAction,
                        saveAction,
                        " ",
                        deleteAction,
                        cloneAction
                    ]
                },
                items:[
                    {
                        xtype:"tabpanel",
                        itemId: 'actionstab',
                        ui: "black-tab",
                        //defaults:{ autoScroll:true },
                        plugins: [
                            Ext.create('Ext.ux.TabCloseMenu', {

                            }),
                            Ext.create('Ext.ux.TabReorderer', {

                            })
                        ]
                    }
                ]
            }
        ];
        /*
        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',
            items:[
                newAction,
                saveAction,
                " ",
                deleteAction
            ]
        };
        */
        this.callParent(arguments);
    }
});

