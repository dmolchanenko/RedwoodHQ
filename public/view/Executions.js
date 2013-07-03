Ext.define('Redwood.view.ExecutionsGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.executionsgrid',
    store: 'Executions',
    selType: 'rowmodel',
    title: "[All Executions]",

    viewConfig: {
        markDirty: false
    },
    minHeight: 150,
    manageHeight: true,
    initComponent: function () {
        var executionsEditor = this;

        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 400
            },
            {
                header: 'Test Set',
                dataIndex: 'testsetname',
                //flex: 1,
                width: 200
            },
            {
                header: 'Status',
                dataIndex: 'status',
                width: 100,
                renderer: function(value,meta,record){
                    if (value == "Ready To Run"){
                        return "<p style='font-weight:bold;color:#ffb013'>"+value+"</p>";
                    }
                    else{
                        return "<p style='font-weight:bold;color:green'>"+value+"</p>";
                    }
                }
            },
            {
                header: 'Tags',
                dataIndex: 'tag',
                width: 400
            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/edit.png',
                        tooltip: 'View',
                        handler: function(grid, rowIndex, colIndex) {
                            var editor = this.up('executionsEditor');
                            editor.fireEvent('executionEdit', grid.store.getAt(rowIndex));
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            var editor = this.up('executionsEditor');
                            editor.fireEvent('executionDelete', grid.store.getAt(rowIndex));
                        }
                    }
                ]
            }
        ];

        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.Executions', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.executionsEditor',
    region:"center",
    layout: "fit",

    initComponent: function () {
        this.items=[
            {
                xtype: "tabpanel",
                ui: "red-tab",
                itemId:"executionsTab",
                plugins: [
                    Ext.create('Ext.ux.TabCloseMenu', {

                    }),
                    Ext.create('Ext.ux.TabReorderer', {

                    })
                ],
                items:[
                    {
                        xtype:"executionsgrid",
                        listeners:{
                            celldblclick: function(me,td,cell,record){
                                var editor = this.up('executionsEditor');
                                editor.fireEvent('executionEdit',record);
                            }
                        }
                    }
                ]
            }
        ];


        this.dockedItems = [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                //'<-',
                {
                    iconCls: 'icon-add',
                    text: 'New Execution',
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('newExecution');
                    }
                }
                ,
                "-",
                {
                    icon: "images/save.gif",
                    tooltip: "Save Selected Execution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('save');
                    }
                },
                "-",
                {
                    icon: "images/stop.png",
                    tooltip: "Stop Selected Execution",
                    itemId: "stopExecution",
                    disabled: true,
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('stop');
                    }
                },
                {
                    icon: "images/play.png",
                    tooltip: "Run Selected Execution",
                    disabled: true,
                    itemId: "runExecution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('run');
                    }
                },
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","name"],
                    store: Ext.data.StoreManager.lookup('Executions')
                }
            ]
        }];
        this.callParent(arguments);
    }



});