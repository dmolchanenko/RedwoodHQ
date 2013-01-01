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

function formatAction(val,metaData,record) {
    return '<img src="images/action.png" align="top"> '+val;
}
function formatTestCase(val,metaData,record) {
    return '<img src="images/action.png" align="top"> '+val;
}

Ext.define('Redwood.view.TestCases', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testcases',
    id: "testcasesBrowser",
    title: "Test Cases",
    layout: 'border',

    initComponent: function () {

        var actionListFlat = {
            //region: 'west',
            //split:true,
            xtype: 'grid',
            hideCollapseTool: true,
            //collapseDirection: "left",
            //collapsible: true,
            multiSelect: false,
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
                        store: Ext.data.StoreManager.lookup('Actions')
                    }
                ]

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
                items:[testCaseListFlat,actionListFlat]

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
                        deleteTestCase
                    ]
                },
                items:[
                    {
                        xtype:"tabpanel",
                        itemId: 'testcasetab',
                        ui: "black-tab",
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

