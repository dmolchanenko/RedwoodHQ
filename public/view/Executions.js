Ext.define('Redwood.view.ExecutionsGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.executionsgrid',
    store: 'Executions',
    selType: 'rowmodel',
    title: "[All Executions]",
    //viewType:"All Executions",

    viewConfig: {
        markDirty: false
    },
    minHeight: 150,
    manageHeight: true,
    selModel: Ext.create('Ext.selection.CheckboxModel', {
        singleSelect: false,
        sortable: true,
        stateful: true,
        showHeaderCheckbox: true,
        listeners: {}
    }),
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
                xtype:"datecolumn",
                header: 'Last Run',
                dataIndex: 'lastRunDate',
                format:'m/d h:i:s',
                width: 100
            },
            {
                header: 'Lock',
                dataIndex: 'locked',
                width: 35,
                renderer: function(value,record){
                    if (value == true){
                        return '<img src="images/lock_ok.png" data-qtip="Execution Locked"/>'
                    }
                    else{
                        return '<img src="images/lock_open.png" data-qtip="Execution Unlocked" />'
                    }
                }
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
        var me = this;
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
                    itemId:"newExecution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('newExecution');
                    }
                }
                ,
                "-",
                {
                    icon: "images/save.gif",
                    itemId:"saveExecution",
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
                    itemId:"searchExecution",
                    paramNames: ["tag","name"],
                    store: Ext.data.StoreManager.lookup('Executions')
                },
                "-",
                {
                    icon: "images/symbol_sum.png",
                    tooltip: "Select Executions to Aggregate",
                    itemId: "aggregationReport",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('aggregate');
                    }
                }
            ]
        }];
        this.callParent(arguments);
    }



});