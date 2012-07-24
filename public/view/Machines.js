Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    machineTest: function(val, field) {

        var store = field.ownerCt.editingPlugin.grid.store;
        var index = store.findExact(field.name,val);
        if (index != -1){
            var foundID = store.getAt(index).internalId;
            if (field.ownerCt.form.getRecord().internalId != foundID){
                this.machineTestText = "Host should be unique.";
                return false;
            }
        }
        return true;
    },
    machineTestText: 'Host should be unique.'
});


Ext.define('Redwood.view.Machines', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.machinesEditor',
    store: 'Machines',
    selType: 'rowmodel',
    rowEditor: Ext.create('Ext.grid.plugin.RowEditing', {
        autoCancel: false,
        clicksToEdit: 2
    }),

    minHeight: 150,
    manageHeight: true,
    initComponent: function () {
        var machinesEditor = this;

        this.columns = [
            {
                header: 'Tags',
                dataIndex: 'tag',
                width: 350,
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
                    store:Ext.data.StoreManager.lookup('MachineTags'),
                    valueField:"value",
                    queryMode: 'local',
                    maskRe: /[a-z_0-9]/,
                    removeOnDblClick:true
                })
            },
            {
                header: 'Roles',
                dataIndex: 'roles',
                width: 350,
                editor: Ext.create('Ext.ux.ComboFieldBox', {
                    displayField:"value",
                    descField:"value",
                    height:24,
                    labelWidth: 100,
                    forceSelection:false,
                    createNewOnEnter:true,
                    encodeSubmitValue:true,
                    autoSelect: false,
                    triggerAction: 'all',
                    store:Ext.data.StoreManager.lookup('MachineRoles'),
                    valueField:"value",
                    queryMode: 'local',
                    removeOnDblClick:true,
                    typeAhead:true,
                    allowBlank: false
                })
            }, {
            header: 'Host Name/IP',
            dataIndex: 'host',
            //flex: 1,
            width: 200,
            editor: {
                xtype: 'textfield',
                allowBlank: false,
                vtype: 'machineTest'
            }
            }, {
                header: 'Description',
                dataIndex: 'description',
                //flex: 1,
                width: 200,
                editor: {
                    xtype: 'textfield',
                    allowBlank: true
                }
            },
            {
            xtype: 'actioncolumn',
            width: 75,
            items: [
                {
                    icon: 'images/edit.png',  // Use a URL in the icon config
                    tooltip: 'Edit',
                    handler: function(grid, rowIndex, colIndex) {
                        machinesEditor.fireEvent('machineEdit', {
                            rowIndex: rowIndex,
                            colIndex: colIndex
                        });
                    }
                },
                {
                    icon: 'images/delete.png',
                    tooltip: 'Delete',
                    handler: function(grid, rowIndex, colIndex) {
                        machinesEditor.fireEvent('machineDelete', {
                            rowIndex: rowIndex,
                            colIndex: colIndex
                        });
                    }
                },{
                    icon: 'images/user_add.gif',
                    tooltip: 'Choose user permissions',
                    handler: function(grid, rowIndex, colIndex) {
                        machinesEditor.fireEvent('choosePermission', {
                            rowIndex: rowIndex,
                            colIndex: colIndex
                        });
                    }
                }
            ]
        }
        ];

        this.plugins = [ this.rowEditor ];


        this.rowEditor.on('validateedit', function (editor, e) {
            if ((Ext.encode(e.newValues) === Ext.encode(e.originalValues) )) {
                return false;
            }
            this.grid.down("#addMachine").setDisabled(true);
        });


        this.rowEditor.on('canceledit', function (editor, e) {
            if (e.record.data._id == "") {
                e.grid.store.removeAt(e.rowIdx);
            }
            this.grid.down("#addMachine").setDisabled(false);
        });



        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',
            items: [
                //'<-',
                {
                    iconCls: 'icon-add',
                    text: 'Add Machine',
                    itemId:"addMachine"
                },
                "-",
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","host","description","roles"],
                    store: Ext.data.StoreManager.lookup('Machines')
                }
            ]
        };
        this.callParent(arguments);
    }
});