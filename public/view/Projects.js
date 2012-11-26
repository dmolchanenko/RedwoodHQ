
Ext.define('Redwood.view.Projects', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.projectsEditor',
    store: 'Projects',
    selType: 'rowmodel',

    minHeight: 150,
    manageHeight: true,
    initComponent: function () {
        var usersEditor = this;

        this.columns = [
            {
                header: 'Key',
                dataIndex: 'key',
                //flex: 1,
                width: 200
            },
            {
                header: 'Description',
                dataIndex: 'description',
                //flex: 1,
                width: 200
            },
            {
                header: 'Role',
                dataIndex: 'role',
                width: 200
            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/edit.png',  // Use a URL in the icon config
                        tooltip: 'Edit',
                        handler: function(grid, rowIndex, colIndex) {
                            usersEditor.fireEvent('userEdit', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            usersEditor.fireEvent('userDelete', {
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
                    text: 'Add Project'
                }
            ]
        }];
        this.callParent(arguments);
    }
});