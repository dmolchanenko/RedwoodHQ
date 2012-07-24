Ext.define('ActionParams', {
    extend: 'Ext.data.Model',
    fields: [
        {type: 'string', name: 'name'},
        {type: 'array', name: 'possiblevalues'},
        {type: 'string', name: 'parametertype'}
    ]
});

Ext.define('ValidValues', {
    extend: 'Ext.data.Model',
    fields: [
        {type: 'string', name: 'value'}
    ]
});

var possibleValues = function(data){
    return Ext.create('Ext.data.ArrayStore', {
        model: 'ValidValues',
        autoSync: true,
        data: data
    });
};

var paramTypes = function(){
    return Ext.create('Ext.data.Store', {
        autoSync: false,
        autoLoad: true,
        idProperty: 'datatype',
        fields: [
            {type: 'string', name: 'datatype'}
        ],
        data: [{datatype:"String"},{datatype:"Boolean"},{datatype:"Array of String"}]
    });
};


Ext.define('Redwood.view.ActionParamGrid',{
    extend: 'Ext.grid.Panel',
    alias: "widget.actionparamgrid",
    selType: 'rowmodel',


    initComponent: function () {
        this.rowEditor = Ext.create('Ext.grid.plugin.RowEditing', {
            autoCancel: false,
            clicksToEdit: 2
        });
        var id = this.id;
        this.store= Ext.create('Ext.data.ArrayStore', {
            storeId:id,
            model: 'ActionParams',
            autoSync: true,
            data: []
        });
        this.plugins =[this.rowEditor];

        this.rowEditor.on("beforeedit",function(editor,e){
            e.grid.columns[2].getEditor().store.removeAll();
            e.record.get("possiblevalues").forEach(function(item){
                e.grid.columns[2].getEditor().store.add({"value":item});
            });

        });
        this.rowEditor.on('validateedit', function (editor, e) {
            if ((Ext.encode(e.newValues) === Ext.encode(e.originalValues) )) {
                return false;
            }

            //this.grid.down("#addParameter").setDisabled(true);
        });


        this.rowEditor.on('canceledit', function (editor, e) {
            if (e.record.data._id == "") {
                e.grid.store.removeAt(e.rowIdx);
            }
            //this.grid.down("#addParameter").setDisabled(false);
        });

        this.callParent(arguments);
    },

    columns:[
        {
            header: 'Name',
            dataIndex: 'name',
            //flex: 1,
            width: 350,
            editor: {
                xtype: 'textfield',
                allowBlank: true
            }
        },
        {
            header: "Parameter Type",
            dataIndex: "parametertype",
            width:100,
            editor: {
                xtype:"combo",
                store: paramTypes(),
                //forceSelection: true,
                triggerAction: 'all',
                selectOnFocus: true,
                editable: false,
                allowBlank: false,
                typeAhead: false,
                //queryMode: 'local',
                displayField: 'datatype',
                valueField: 'datatype',
                lazyRender: true,
                listClass: 'x-combo-list-small'
            }
        },
        {
            header: 'Possible Values',
            dataIndex: 'possiblevalues',
            //width: 350,
            flex: 1,
            editor: Ext.create('Ext.ux.ComboFieldBox', {
                typeAhead:true,
                displayField:"value",
                descField:"value",
                height:24,
                labelWidth: 100,
                forceSelection:false,
                createNewOnEnter:true,
                encodeSubmitValue:true,
                autoSelect: true,
                store:possibleValues([]),
                valueField:"value",
                queryMode: 'local',
                removeOnDblClick:true
            })
        },
        {
            xtype: 'actioncolumn',
            width: 75,
            items: [
                {
                    icon: 'images/edit.png',
                    tooltip: 'Edit',
                    handler: function(grid, rowIndex, colIndex) {
                        grid = this.up("actionparamgrid");
                        var store = grid.store;
                        var record = store.getAt(rowIndex);
                        if(record) {
                            grid.rowEditor.startEdit(record, grid.columns[0]);
                        }
                    }
                },
                {
                    icon: 'images/delete.png',
                    tooltip: 'Delete',
                    handler: function(grid, rowIndex, colIndex) {
                        grid = this.up("actionparamgrid");
                        var store = grid.store;

                        if (grid.rowEditor.editing){
                            return;
                        }
                        var record = store.getAt(rowIndex);
                        if(record) {
                            store.remove(record);
                        }
                    }
                }
            ]
        }
    ],
    minHeight: 150,
    manageHeight: true,
    //store:paramstore(),
    tbar: {
        xtype: 'toolbar',
        dock: 'top',
        items: [
            //'<-',
            {
                iconCls: 'icon-add',
                text: 'Add Parameter',
                itemId: "addParameter",
                handler: function(){
                    var grid = this.up("actionparamgrid");
                    if(grid.rowEditor.editing)
                        return false;

                    // add blank item to store -- will automatically add new row to grid
                    var blank = grid.store.add({
                        name: 'newParam',
                        possiblevalues:[],
                        parametertype:"String"
                        //vmName: ''
                    })[0];

                    grid.rowEditor.startEdit(blank, grid.columns[0]);
                    //grid.machinesEditor.getDockedComponent('top').getComponent('add').setDisabled(true);
                }
            }
        ]
    },
    listeners:{
    }

});


Ext.define('Redwood.view.ActionView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.actionview',
    bodyPadding: 5,
    myData:[],

    items: [
        {
            xtype: 'fieldset',
            title: 'Action Details',
            defaultType: 'textfield',
            width: 1000,
            collapsible: true,
            defaults: {
                width: 970
            },
            items: [
                    {
                        //xtype: "textfield",
                        fieldLabel: "Name"
                    }
                    ,
                    /*
                    {
                        xtype:"boxselect",
                        typeAhead:true,
                        fieldLabel: "Tags",
                        displayField:"value",
                        height:24,
                        width:300,
                        labelWidth: 100,
                        forceSelection:false,
                        createNewOnEnter:true,
                        encodeSubmitValue:true,
                        createNewOnBlur: true,
                        store:Ext.data.StoreManager.lookup('ActionTags'),
                        valueField:"value",
                        queryMode: 'local',
                        maskRe: /[a-z_0-9]/
                    }
                    */

                    {
                        xtype:"combofieldbox",
                        typeAhead:true,
                        fieldLabel: "Tags",
                        displayField:"value",
                        descField:"value",
                        height:24,
                        //labelWidth: 100,
                        forceSelection:false,
                        createNewOnEnter:true,
                        encodeSubmitValue:true,
                        autoSelect: true,
                        createNewOnBlur: true,
                        store:Ext.data.StoreManager.lookup('ActionTags'),
                        valueField:"value",
                        queryMode: 'local',
                        maskRe: /[a-z_0-9]/,
                        removeOnDblClick:true
                    }
                ]
        },

        {
            xtype: 'fieldset',
            title: 'Parameters',
            width: 1000,
            collapsible: true,
            defaults: {
                width: 970
            },
            items:[
                {
                    xtype:"actionparamgrid"

                }
            ]
        }

    ]

});