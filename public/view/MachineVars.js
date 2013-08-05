Ext.define('Redwood.view.MachineVars', {
    extend: 'Ext.window.Window',
    alias: 'widget.machinevars',
    title: 'Machine Variables',
    id: "EditUser",
    draggable: true,
    resizable: true,
    width: 400,
    height: 300,
    layout: 'fit',
    modal: true,
    initComponent: function () {
        var me = this;

        var machineVarStore =  new Ext.data.Store({
            sorters: [{
                property : 'name',
                direction: 'ASC'

            }],
            fields: [
                {name: 'name',     type: 'string'},
                {name: '_id',     type: 'string'},
                {name: 'value',     type: 'string'}
            ],
            data: []
        });

        var machineVarsGrid = new Ext.grid.Panel({
            rowEditor: Ext.create('Ext.grid.plugin.RowEditing', {
                autoCancel: false,
                clicksToEdit: 2,
                listeners:{
                    validateedit: function (editor, e) {
                        if ((Ext.encode(e.newValues) === Ext.encode(e.originalValues) )) {
                            return false;
                        }
                        machineVarsGrid.down("#addVar").setDisabled(false);
                    },
                    canceledit: function (editor, e) {
                        // delete empty record on cancel
                        if (e.record.data._id == "") {
                            e.grid.store.removeAt(e.rowIdx);
                        }
                        machineVarsGrid.down("#addVar").setDisabled(false);
                    }
                }
            }),
            minHeight: 150,
            manageHeight: true,
            viewConfig:{
                markDirty: false
            },
            store:machineVarStore,
            tbar:{
                xtype: 'toolbar',
                dock: 'top',
                //hight: "22px",
                items: [
                    //'<-',
                    {
                        iconCls: 'icon-add',
                        text: 'Add Variable',
                        itemId:"addVar",
                        handler: function(){
                            if(machineVarsGrid.rowEditor.editing)
                                return false;

                            var blank;

                            // add blank item to store -- will automatically add new row to grid
                            blank = machineVarStore.add({
                                name:"",
                                value:""
                            })[0];

                            machineVarsGrid.rowEditor.startEdit(blank, machineVarsGrid.columns[0]);
                        }
                    }
                ]
            },
            columns:[
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 200,
                editor: {
                    xtype: 'textfield',
                    vtype: 'varTest',
                    allowBlank: false,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            }, {
                header: 'Value',
                dataIndex: 'value',
                //width: 500,
                flex: 1,
                renderer:function(value, meta, record){
                    return Ext.util.Format.htmlEncode(value);
                },
                editor: {
                    xtype: 'textfield',
                    allowBlank: false,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }

            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/edit.png',  // Use a URL in the icon config
                        tooltip: 'Edit',
                        handler: function(grid, rowIndex, colIndex) {
                            var record = machineVarStore.getAt(rowIndex);
                            if(record) {
                                machineVarsGrid.rowEditor.startEdit(record, machineVarsGrid.columns[colIndex]);
                            }
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            if (machineVarsGrid.rowEditor.editing){
                                return;
                            }
                            var record = machineVarStore.getAt(rowIndex);
                            if(record) {
                                machineVarStore.remove(record);
                            }
                        }
                    }
                ]
            }
        ]
    });

    var form = new Ext.panel.Panel(
        {
            layout: 'form',
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            //layout:"fit",
            bodyPadding: 5,
            border: false,
            items:[
                machineVarsGrid
            ],
            buttons: [
                {
                    xtype: "button",
                    text: "OK",
                    itemId: "SubmitForm",
                    handler: function(btn){
                        var vars = [];
                        machineVarStore.each(function(variable){
                            vars.push({name:variable.get("name"),value:variable.get("value")})
                        });
                        me.onMachineVarsSave(vars);
                        me.close();
                    }
                },{
                    xtype: "button",
                    text: "Cancel",
                    handler: function(){
                        me.close();
                    }
                }

            ]
        }

    );

    this.items = [
        //machineVarsGrid
        form
    ];

    this.callParent(arguments);
    }
});
