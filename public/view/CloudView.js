Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    hostsTest: function(val, field) {

        var store = field.ownerCt.editingPlugin.grid.store;
        var index = store.findExact(field.name,val);
        if (index != -1){
            var foundID = store.getAt(index).internalId;
            if (field.ownerCt.form.getRecord().internalId != foundID){
                this.hostsTestText = "Host should be unique.";
                return false;
            }
        }
        return true;
    },
    hostsTestText: 'Host should be unique.'
});

Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    templatesTest: function(val, field) {

        var store = field.ownerCt.editingPlugin.grid.store;
        var index = store.findExact(field.name,val);
        if (index != -1){
            var foundID = store.getAt(index).internalId;
            if (field.ownerCt.form.getRecord().internalId != foundID){
                this.templatesTestText = "Template name should be unique.";
                return false;
            }
        }
        return true;
    },
    templatesTestText: 'Template name should be unique.'
});

Ext.define('Redwood.view.HostsView', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.hostsView',
    store: 'Hosts',
    selType: 'rowmodel',
    title: "[Hosts]",
    minHeight: 150,
    manageHeight: true,
    rowEditor: Ext.create('Ext.grid.plugin.RowEditing', {
        autoCancel: false,
        clicksToEdit: 2
    }),
    listeners:{
        celldblclick: function(me,td,cell,record){
            me.fireEvent('hostEdit',record);
        }
    },
    initComponent: function () {
        this.viewConfig = {
            markDirty: false
        };

        this.tbar = {
            items:[
                {
                    iconCls: 'icon-add',
                    text: 'Add Host',
                    itemId:"addHost",
                    listeners:{
                        click:function(){
                            var editor = this.up('hostsView');
                            editor.fireEvent('addHost');
                        }
                    }
                },
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["host"],
                    store: Ext.data.StoreManager.lookup('Hosts')
                }

            ]
        };

        this.columns = [
            {
                header: 'Host Name/IP',
                dataIndex: 'host',
                width: 200,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false,
                    vtype: 'hostsTest',
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: 'Description',
                dataIndex: 'description',
                width: 250,
                editor: {
                    xtype: 'textfield',
                    allowBlank: true,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: 'Max VMs',
                dataIndex: 'maxVMs',
                //flex: 1,
                width: 100,
                editor: {
                    xtype: 'numberfield',
                    allowBlank: false,
                    minValue: 1
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
                            grid.up("hostsView").fireEvent('hostEdit', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
                            //grid.up("hostsView").fireEvent('hostEdit', grid.store.getAt(rowIndex));
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            grid.up("hostsView").fireEvent('hostDelete', {
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
        });
        this.rowEditor.on('canceledit', function (editor, e) {
            if (e.record.data._id == "") {
                e.grid.store.removeAt(e.rowIdx);
            }
        });
        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.TemplatesView', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.templatesView',
    store: 'Templates',
    selType: 'rowmodel',
    title: "[Templates]",
    minHeight: 150,
    manageHeight: true,
    rowEditor: Ext.create('Ext.grid.plugin.RowEditing', {
        autoCancel: false,
        clicksToEdit: 2
    }),
    listeners:{
        celldblclick: function(me,td,cell,record){
            me.fireEvent('templateEdit',record);
        }
    },
    initComponent: function () {
        this.viewConfig = {
            markDirty: false
        };

        this.tbar = {
            items:[
                {
                    iconCls: 'icon-add',
                    text: 'Add Template',
                    listeners:{
                        click:function(){
                            var editor = this.up('templatesView');
                            editor.fireEvent('addTemplate');
                        }
                    }
                },
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["name"],
                    store: Ext.data.StoreManager.lookup('Templates')
                }

            ]
        };

        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                width: 200,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false,
                    vtype: 'templatesTest',
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: 'OS Name',
                dataIndex: 'os',
                //flex: 1,
                width: 200,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false
                }
            },
            {
                header: 'Description',
                dataIndex: 'description',
                width: 250,
                editor: {
                    xtype: 'textfield',
                    allowBlank: true,
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
                            grid.up("templatesView").fireEvent('templateEdit', {
                                rowIndex: rowIndex,
                                colIndex: colIndex
                            });
                            //grid.up("hostsView").fireEvent('hostEdit', grid.store.getAt(rowIndex));
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            grid.up("templatesView").fireEvent('templateDelete', {
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
        });
        this.rowEditor.on('canceledit', function (editor, e) {
            if (e.record.data._id == "") {
                e.grid.store.removeAt(e.rowIdx);
            }
        });
        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.CloudView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.cloudView',
    region:"center",
    layout: "fit",

    initComponent: function () {
        this.items=[
            {
                xtype: "tabpanel",
                ui: "red-tab",
                itemId:"hostsTab",
                items:[
                    {
                        xtype:"templatesView"
                    },
                    {
                        xtype:"hostsView"
                    }
                ]
            }
        ];

        this.callParent(arguments);
    }

});