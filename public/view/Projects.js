
Ext.define('Redwood.view.Projects', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.projectsEditor',
    store: 'Projects',
    selType: 'rowmodel',

    minHeight: 150,
    manageHeight: true,
    initComponent: function () {
        var me = this;


        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 200
            },
            {
                header: 'Language',
                dataIndex: 'language',
                //flex: 1,
                hidden:true,
                width: 200
            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            me.fireEvent('projectDelete', {
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
                {
                    iconCls: 'icon-add',
                    text: 'Add Project',
                    handler: function(){
                        me.fireEvent('addProject');
                    }
                }
            ]
        }];
        this.callParent(arguments);
    }
});