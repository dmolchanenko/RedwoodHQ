var deleteColumnAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    tooltip: "Delete selected column.",
    text:"Delete Column",
    handler: function(widget, event) {
        console.log("deleting")
    }
});

var contextMenu = Ext.create('Ext.menu.Menu', {
    column:null,
    items: [
        deleteColumnAction
    ]
});


Ext.define('Redwood.view.TestCaseDataGrid', {
    extend: 'Ext.grid.Panel',
    alias: "widget.testcasedatagrid",
    autoHeight: true,
    sortableColumns: false,
    selType: 'cellmodel',
    plugins: {
        ptype: 'cellediting',
        clicksToEdit: 1
    },

    listeners: {
        headercontextmenu: function (me,column,e,t,eOpts) {
            e.stopEvent();
            contextMenu.column = column;
            contextMenu.showAt(e.getXY());
        }

    },

    tbar: {
        xtype: 'toolbar',
        dock: 'top',
        items: [
            {
            iconCls: 'icon-add',
            text: "Add Column",
            tooltip:"Add Column",
            itemId: "addColumnAction",
            handler: function(){
                var me = this;
                Ext.Msg.prompt('Column Name', 'Please enter column name:', function(btn, text){
                    if (btn == 'ok' && text){
                        var grid = me.up("testcasedatagrid");
                        for(var i=0;i<grid.store.getFields().length;i++){

                        }
                        var eColumn = Ext.create('Ext.grid.column.Column', {
                            text:text,
                            menuDisabled:true
                            //header: 'E',
                            //dataIndex: 'echo'
                        });
                        grid.headerCt.insert(grid.columns.length, eColumn);
                        grid.getView().refresh();
                    }
                });
            }
        }
        ]
    },
    columns: [
        Ext.create('Ext.grid.RowNumberer')
    ],


    initComponent: function () {

        var me = this;

        this.callParent(arguments);
    }
});


Ext.define('Redwood.view.TestCaseData', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testcasedata',

    height: 1000,

    initComponent: function () {

        var tcDataStore =  new Ext.data.Store({
            fields: [],
            data: []
        });

        this.items =[

            {
                xtype:"testcasedatagrid",
                flex: 1,
                itemId: "datagrid",
                padding: "0 10 10 2",
                store:tcDataStore

            }
        ];
        this.callParent(arguments);
    }

});