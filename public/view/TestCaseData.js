var deleteColumnAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    tooltip: "Delete selected column.",
    text:"Delete Column",
    handler: function(widget, event) {

        var grid = widget.up("menu").grid;
        var fields = grid.store.model.getFields();
        var newFields = [];

        fields.forEach(function(field){
            if(field.name != widget.up("menu").column.dataIndex){
                newFields.push(field);
            }
        });
        grid.store.model.setFields(newFields);

        grid.headerCt.remove(widget.up("menu").column);
        grid.getView().refresh();
    }
});

var testDataContextMenu = Ext.create('Ext.menu.Menu', {
    column:null,
    items: [
        deleteColumnAction
    ]
});

Ext.define('Redwood.view.TestCaseDataGrid', {
    extend: 'Ext.grid.Panel',
    alias: "widget.testcasedatagrid",
    height:400,
    sortableColumns: false,
    selType: 'cellmodel',
    plugins: {
        ptype: 'cellediting',
        clicksToEdit: 1
    },

    viewConfig: {
        preserveScrollOnRefresh:true,
        markDirty: false
    },

    listeners: {
        columnmove:function(){
            if(this.up("testcasedata").loadingData == false) this.up("testcasedata").markDirty();
        },
        headercontextmenu: function (me,column,e,t,eOpts) {
            e.stopEvent();
            testDataContextMenu.column = column;
            testDataContextMenu.grid = me.grid;
            testDataContextMenu.showAt(e.getXY());
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
            //itemId: "addColumnAction",
            handler: function(){
                var me = this;
                Ext.Msg.prompt('Column Name', 'Please enter column name:', function(btn, text){
                    if (btn == 'ok' && text){
                        me.up("testcasedatagrid").addDataColumn(text);
                    }
                });
            }
        },
            {
                iconCls: 'icon-add',
                text: "Add Row",
                tooltip:"Add Row",
                //itemId: "addColumnAction",
                handler: function(){
                    this.up("testcasedata").lastScrollPos = this.up("testcasedata").parentPanel.getEl().dom.children[0].scrollTop;
                    var grid = this.up("testcasedatagrid");
                    var fields = grid.store.model.getFields();
                    var row = {};

                    fields.forEach(function(field){
                        //row[field.name] = "";
                        if(field.type.type != "auto") row[field.name] = "<NULL>";
                    });

                    grid.store.add(row);
                    grid.getView().refresh();
                    this.up("testcasedata").parentPanel.getEl().dom.children[0].scrollTop = this.up("testcasedata").lastScrollPos;
                    grid.getView().getNode(grid.store.data.getCount()-1).scrollIntoView();
                    //grid.getView().focusRow(grid.store.data.getCount())
                }
            }

        ]
    },
    columns: [
        {xtype: 'rownumberer'},
        {
            xtype: 'actioncolumn',
            width: 25,
            draggable:false,
            items: [
                {
                    icon: 'images/delete.png',
                    tooltip: 'Delete',
                    handler: function (grid, rowIndex, colIndex) {
                        this.up("testcasedata").lastScrollPos = this.up("testcasedata").parentPanel.getEl().dom.children[0].scrollTop;
                        grid.store.remove(grid.store.getAt(rowIndex));
                        grid.refresh();
                        this.up("testcasedata").parentPanel.getEl().dom.children[0].scrollTop = this.up("testcasedata").lastScrollPos;
                    }
                }
            ]
        }
    ],


    initComponent: function () {

        var me = this;
        me.addDataColumn = function(text){
            var dataIndex = text;
            //rownumberer needs id field so can't use it directly
            if(text == "id") dataIndex = "id_&&&";
            //var grid = me.up("testcasedatagrid");
            var grid = me;
            for(var i=0;i<grid.headerCt.gridDataColumns.length;i++){
                if(grid.headerCt.gridDataColumns[i].initialConfig.text == text){
                    Ext.Msg.alert('Error', "Error column with  name: "+text+" already exists.");
                    return;
                }
            }

            var fields = grid.store.model.getFields();
            fields.push(Ext.create('Ext.data.Field', {
                name:dataIndex,
                type:"string"
            }));
            grid.store.model.setFields(fields);
            grid.store.each(function(record){
                record.set(dataIndex,"<NULL>");
            });

            var eColumn = Ext.create('Ext.grid.column.Column', {
                text:text,
                width:140,
                sortable:false,
                menuDisabled:true,
                editor:{
                    xtype: 'textfield',
                    listeners:{
                        focus: function(elem){
                            setTimeout(function () {
                                elem.selectText();
                            }, 50);
                        },
                        change: function(){
                            if(this.up("testcasedata").loadingData == false) this.up("testcasedata").markDirty();
                        }
                    }
                },
                dataIndex: dataIndex,
                renderer: function(val, meta, record){
                    meta.tdCls = 'x-redwood-results-cell';
                    return Ext.util.Format.htmlEncode(val);
                }
            });
            grid.headerCt.insert(grid.headerCt.gridDataColumns.length-1, eColumn);
            grid.getView().refresh();
            if(this.up("testcasedata").loadingData == false) this.up("testcasedata").markDirty();
        };

        this.callParent(arguments);
    }
});


Ext.define('Redwood.view.TestCaseData', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testcasedata',
    loadingData: true,

    height: 400,

    loadData: function(data){
        var grid = this.down("testcasedatagrid");
        if(data.forEach){
            data.forEach(function(row,index){
                //add columns
                if(index == 0){
                    for (var property in row) {
                        if (row.hasOwnProperty(property)) {
                            grid.addDataColumn(property);
                        }
                    }

                }
                grid.store.add(row);
            });
        }
        this.loadingData = false;
    },

    getTestCaseData: function(){
        var grid = this.down("testcasedatagrid");
        var tcData = [];

        grid.store.data.each(function(record){
            var dataRecord = {};
            grid.headerCt.gridDataColumns.forEach(function(column){
                if(column.dataIndex) {
                    //rename back to id
                    if(column.dataIndex == "id_&&&"){
                        dataRecord.id = record.get(column.dataIndex);
                    }
                    else{
                        dataRecord[column.dataIndex] = record.get(column.dataIndex);
                    }
                }
            });
            tcData.push(dataRecord);
        });
        return tcData;
    },

    initComponent: function () {

        var me = this;

        var tcDataStore =  new Ext.data.Store({
            fields: [],
            data: [],
            listeners:{
                datachanged: function(){
                    if(me.loadingData == false) me.markDirty();
                }
            }
        });


        this.items =[

            {
                xtype:"testcasedatagrid",
                flex: 1,
                itemId: "testcaseDataGrid",
                padding: "0 10 10 2",
                store:tcDataStore

            }
        ];

        this.callParent(arguments);
    }

});