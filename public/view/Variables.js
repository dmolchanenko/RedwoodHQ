Ext.apply(Ext.form.field.VTypes, {
    tagTest: function(val,field){
        return true;
    },
    tagTestMask: /[a-z_0-9]/
});

Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    varTest: function(val, field) {
        var varTest = /^[A-Za-z_][A-Za-z_0-9]*$/;

        if (varTest.test(val) == false){
            this.varTestText= 'Name should conform to variable name rules.';
            return false;
        }
        var store = field.ownerCt.editingPlugin.grid.store;
        var index = store.findExact(field.name,val);
        if (index != -1){
            var foundID = store.getAt(index).internalId;
            if (field.ownerCt.form.getRecord().internalId != foundID){
            //if (store.findExact(field.name,val,index) != -1){
                this.varTestText = "Variable with the same name already exists";
                return false;
            }
        }
        return true;
    },
    // vtype Text property: The error text to display when the validation function returns false
    varTestText: 'Name should conform to variable name rules.'
    // vtype Mask property: The keystroke filter mask
    //varTestMask: /^[A-Za-z_][A-Za-z_0-9]*$/
});


Ext.define('Redwood.view.Variables', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.variablesEditor',
    store: 'Variables',
    selType: 'rowmodel',
    rowEditor: Ext.create('Ext.grid.plugin.RowEditing', {
        autoCancel: false,
        clicksToEdit: 2
    }),

    minHeight: 150,
    manageHeight: true,


    initComponent: function () {
        var variablesEditor = this;

        this.viewConfig = {
            markDirty: false
        };

        this.columns = [
            {
                xtype: 'checkcolumn',
                header: "Execution Var",
                dataIndex: 'taskVar',
                width: 80,
                editor:{
                    xtype:'checkboxfield'
                },
                listeners:{
                    checkchange: function(){
                        variablesEditor.fireEvent("edit");
                    }
                }
            },
            {
                header: 'Tags',
                dataIndex: 'tag',
                //flex: 1,
                width: 250,
                editor: Ext.create('Ext.ux.ComboFieldBox', {
                    //fieldLabel: 'Enter Tags',
                    displayField:"value",
                    descField:"value",
                    height:24,
                    //width: 420,
                    labelWidth: 100,
                    forceSelection:false,
                    createNewOnEnter:true,
                    encodeSubmitValue:true,
                    autoSelect: true,
                    store:Ext.data.StoreManager.lookup('VariableTags'),
                    //valueStore:varTagsStore,
                    valueField:"value",
                    queryMode: 'local',
                    vtype:"tagTest",
                    removeOnDblClick:true
                    //renderTo: 'basicBoxselect'
                })
            }, {
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
            editor: Ext.create('Ext.ux.ComboGridBox', {
                typeAhead: true,
                displayField: 'text',
                queryMode: 'local',
                valueField:'value',
                descField:"text",
                grid: variablesEditor,
                dataIndex:"possibleValues",
                displayNULLOption:true,
                listeners:{
                    focus: function(){
                        this.selectText();
                    }
                },
                getDisplayValue: function() {
                    return Ext.String.htmlDecode(this.value);
                }
            })
        },
            {
                header: 'Possible Values',
                dataIndex: 'possibleValues',
                //flex: 1,
                width: 400,
                editor: Ext.create('Ext.ux.ComboFieldGridBox', {
                    //fieldLabel: 'Enter Tags',
                    dataIndex: 'possibleValues',
                    grid: variablesEditor,
                    displayField:"value",
                    //descField:"value",
                    height:24,
                    //width: 420,
                    labelWidth: 100,
                    forceSelection:false,
                    createNewOnEnter:true,
                    encodeSubmitValue:true,
                    autoSelect: true,
                    //store:Ext.data.StoreManager.lookup('VariableTags'),
                    //valueStore:varTagsStore,
                    valueField:"value",
                    queryMode: 'local',
                    removeOnDblClick:true
                    //vtype:"tagTest"
                    //renderTo: 'basicBoxselect'
                })
            },
            {
            xtype: 'actioncolumn',
            width: 50,
            items: [
                {
                    icon: 'images/edit.png',  // Use a URL in the icon config
                    tooltip: 'Edit',
                    handler: function(grid, rowIndex, colIndex) {
                        variablesEditor.fireEvent('varEdit', {
                            rowIndex: rowIndex,
                            colIndex: colIndex
                        });
                    }
                },
                {
                    icon: 'images/delete.png',
                    tooltip: 'Delete',
                    handler: function(grid, rowIndex, colIndex) {
                        variablesEditor.fireEvent('varDelete', {
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
            this.grid.down("#addVar").setDisabled(false);
        });


        this.rowEditor.on('canceledit', function (editor, e) {
            //console.log("AAAAGGAA");
            // delete empty record on cancel
            if (e.record.data._id == "") {
                e.grid.store.removeAt(e.rowIdx);
            }
            this.grid.down("#addVar").setDisabled(false);
        });



        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',
            //hight: "22px",
            items: [
                //'<-',
                {
                    iconCls: 'icon-add',
                    text: 'Add Variable',
                    itemId:"addVar"
                },
                "-",
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","name","value"],
                    store: Ext.data.StoreManager.lookup('Variables')
                }
            ]
        };
        this.callParent(arguments);
    }
});