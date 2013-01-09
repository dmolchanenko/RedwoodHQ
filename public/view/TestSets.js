                           
Ext.define('Redwood.view.TestSets', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.testsetsEditor',
    store: 'TestSets',
    selType: 'rowmodel',

    minHeight: 150,
    manageHeight: true,
    initComponent: function () {
        var testsetsEditor = this;

        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
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
                            testsetsEditor.fireEvent('testsetEdit', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            testsetsEditor.fireEvent('testsetDelete', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
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
                    text: 'Add TestSet'
                }
                /*,
                "-",
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","testsetname","role","name"],
                    store: Ext.data.StoreManager.lookup('TestSets')
                }
                */
            ]
        }];
        this.callParent(arguments);
    }
});