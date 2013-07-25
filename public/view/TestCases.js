var newTestCase = Ext.create('Ext.Action', {
    icon: 'images/page_add.png',
    text: 'New Test Case',
    itemId: "newTestCase",
    tooltip: "New Test Case",
    handler: function(widget, event) {
        var editor = this.up('testcases');
        editor.fireEvent('newTestCase');
    }
});

var saveTestCase = Ext.create('Ext.Action', {
    icon: "images/save.gif",
    tooltip: "Save Selected Test Case",
    handler: function(widget, event) {
        var editor = this.up('testcases');
        editor.fireEvent('saveTestCase');
    }
});

var deleteTestCase = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    text: 'Delete',
    itemId: "deleteTestCase",
    tooltip: "Delete Selected Test Case",
    handler: function(widget, event) {
        var editor = this.up('testcases');
        editor.fireEvent('deleteTestCase');
    }
});

var cloneTestCase = Ext.create('Ext.Action', {
    icon: 'images/clone.png',
    //text: 'Delete',
    itemId: "cloneTestCase",
    tooltip: "Clone Selected Test Case",
    handler: function(widget, event) {
        var editor = this.up('testcases');
        editor.fireEvent('cloneTestCase');
    }
});

function formatTestCase(val,metaData,record) {
    return '<img src="images/testcase.png" align="top"> '+val;
}

Ext.define('Redwood.view.TestCases', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testcases',
    id: "testcasesBrowser",
    title: "Test Cases",
    layout: 'border',

    initComponent: function () {
        var me = this;
        var actionsStore = Ext.data.StoreManager.lookup('Actions');

        var actionsPanelStore = Ext.create('Ext.data.ArrayStore', {
            storeId: 'ActionsTestCaseCombo',
            model:"Redwood.model.Actions",
            data:[]
        });

        actionsStore.on("beforesync", function(options,eOpts){
            if (options.create){
                options.create.forEach(function(r){
                    actionsPanelStore.add(r);
                });
            }
            if (options.destroy){
                options.destroy.forEach(function(r){
                    if (r != null){
                        actionsPanelStore.remove(actionsPanelStore.findRecord("_id", r.get("_id")));
                    }
                });
            }
            if (options.update){
                options.update.forEach(function(r){
                    actionsPanelStore.remove(actionsPanelStore.findRecord("_id", r.get("_id")));
                    actionsPanelStore.add(r);
                });
            }
        });

        this.actionStoreLoaded = false;

        actionsStore.on("load",function(store){
            if (me.actionStoreLoaded == false){
                me.actionStoreLoaded = true;

                var records = [];
                actionsStore.each(function(r){
                    records.push(r.copy());
                });
                actionsPanelStore.add(records);
            }

        });

        var actionListFlat = {
            //region: 'west',
            //split:true,
            xtype: 'grid',
            hideCollapseTool: true,
            //collapseDirection: "left",
            //collapsible: true,
            multiSelect: false,
            store: actionsPanelStore,
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
                }
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    //me.up('actions').fireEvent('editAction',record);
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
                        store: actionsPanelStore
                    }
                ]

            }
        };

        var actionListTree = {
            xtype: 'treepanel',
            multiSelect: false,
            hideCollapseTool: true,
            rootVisible: false,
            store: Ext.data.StoreManager.lookup('ActionsTree'),
            width: 206,
            title: "Actions Tree",
            focused: false,
            hideHeaders: true,
            displayField:"name",
            viewConfig: {
                markDirty: false,
                plugins: {
                    ptype: 'treeviewdragdrop',
                    enableDrag: true,
                    enableDrop: false,
                    ddGroup: "actionDrop"
                }
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    //if (!record.get("tagValue")){
                        //var found = Ext.data.StoreManager.lookup('Actions').findRecord("_id",record.get("_id"));
                        //me.up('actions').fireEvent('editAction',found);
                    //}
                }
            }
        };

        var testCaseListTree = {
            xtype: 'treepanel',
            multiSelect: false,
            hideCollapseTool: true,
            rootVisible: false,
            store: Ext.data.StoreManager.lookup('TestCaseTree'),
            width: 206,
            title: "Test Case Tree",
            focused: false,
            hideHeaders: true,
            displayField:"name",
            viewConfig: {
                markDirty: false
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    if (!record.get("tagValue")){
                        var found = Ext.data.StoreManager.lookup('TestCases').findRecord("_id",record.get("_id"));
                        me.up('testcases').fireEvent('editTestCase',found);
                    }
                }
            }
        };

        var testCaseListFlat = {
            //region: 'west',
            //split:true,
            xtype: 'grid',
            hideCollapseTool: true,
            //collapseDirection: "left",
            //collapsible: true,
            multiSelect: false,
            store: Ext.data.StoreManager.lookup('TestCases'),
            width: 206,
            title: "Test Cases",
            focused: false,
            hideHeaders: true,
            viewConfig: {
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    me.up('testcases').fireEvent('editTestCase',record);
                }
            },
            columns: [
                {
                    dataIndex: 'name',
                    flex: 1,
                    renderer: formatTestCase
                }
            ],
            tbar: {
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    {
                        width: 200,
                        xtype: 'searchfield',
                        paramNames: ["tag","name"],
                        store: Ext.data.StoreManager.lookup('TestCases')
                    }
                ]

            }
        };


        this.items=[
            {
                xtype:"panel",
                layout: "accordion",
                region: 'west',
                split:true,
                width: 206,
                collapseDirection: "left",
                collapsible: true,
                items:[testCaseListFlat,testCaseListTree,actionListFlat,actionListTree]

            },
            {
                xtype:"panel",
                region:"center",
                layout: "fit",
                tbar: {
                    xtype: 'toolbar',
                    dock: 'top',
                    items:[
                        newTestCase,
                        saveTestCase,
                        " ",
                        deleteTestCase,
                        "-",
                        cloneTestCase
                    ]
                },
                items:[
                    {
                        xtype:"tabpanel",
                        itemId: 'testcasetab',
                        ui: "green-tab",
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
        this.callParent(arguments);
    }
});

