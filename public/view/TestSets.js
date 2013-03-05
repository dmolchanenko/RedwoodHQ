                           
Ext.define('Redwood.view.TestSetsGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.testsetsGrid',
    store: 'TestSets',
    selType: 'rowmodel',
    title: "[All Test Sets]",

    minHeight: 150,
    manageHeight: true,
    listeners:{
        celldblclick: function(me,td,cell,record){
            var editor = this.up('testsetsEditor');
            editor.fireEvent('testsetEdit',record);
        }
    },
    initComponent: function () {
        var me = this;

        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                width: 400
            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/edit.png',  // Use a URL in the icon config
                        tooltip: 'Edit',
                        handler: function(grid, rowIndex, colIndex) {
                            grid.up("testsetsEditor").fireEvent('testsetEdit', grid.store.getAt(rowIndex));
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            grid.up("testsetsEditor").fireEvent('testsetDelete', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
                        }
                    }
                ]
            }
        ];
        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.TestSets', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testsetsEditor',
    region:"center",
    layout: "fit",

    initComponent: function () {
        this.items=[
            {
                xtype: "tabpanel",
                ui: "red-tab",
                itemId:"testsetTab",
                items:[
                    {
                        xtype:"testsetsGrid"
                    }
                ]
            }
        ];


        this.dockedItems = [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    iconCls: 'icon-add',
                    text: 'New Test Set',
                    handler: function(widget, event) {
                        var editor = this.up('testsetsEditor');
                        editor.fireEvent('newTestSet');
                    }
                }
                ,
                "-",
                {
                    icon: "images/save.gif",
                    tooltip: "Save Selected Test Set",
                    handler: function(widget, event) {
                        var editor = this.up('testsetsEditor');
                        editor.fireEvent('save');
                    }
                },
                "-",
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","name"],
                    store: Ext.data.StoreManager.lookup('TestSets')
                }
            ]
        }];
        this.callParent(arguments);
    }



});