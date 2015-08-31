Ext.apply(Ext.form.field.VTypes, {
    projectNameText: 'Project with the same name already exists',
    projectName: function(val,field){
        var store = Ext.data.StoreManager.lookup('Projects');
        var index = store.findExact(field.name,val);
        if (index != -1){
            return false;
        }
        return true;
    },
    projectNameMask: /^(?!^(PRN|AUX|CLOCK\$|NUL|CON|COM\d|LPT\d|\..*)(\..+)?$)[^\x00-\x1f\\?*:\";|/]+$/
    //passwordTestMask: /[a-z_0-9]/
});

Ext.define('Redwood.view.ProjectEdit', {
    extend: 'Ext.window.Window',
    alias: 'widget.projectEdit',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    newProject: true,
    defaultFocus: "name",
    title: 'Project Properties',
    id: "projectEdit",
    draggable: true,
    resizable: true,
    width: 700,
    height: 500,
    layout: 'fit',
    modal: true,
    dataRecord:null,
    //onAfterrender: function(me,eOpts){
    //    this.down('form').getForm().findField("username").focus();
    //},
    initComponent: function () {
        var me = this;
        this.items= {
            xtype:"form",
            layout:"anchor",
            bodyPadding: 5,
            defaults: {
                anchor: '100%'
            },
            buttons: [
                {
                    text: 'Submit',
                    itemId: "submit",
                    formBind: true, //only enabled once the form is valid
                    disabled: true,
                    handler: function() {
                        var form = this.up('form').getForm();
                        if (form.isValid()) {
                            var window = this.up('window');
                            var newProject = {};
                            newProject.name = form.getFieldValues().name;
                            newProject.language = form.getFieldValues().language;
                            newProject.template = form.getFieldValues().template;
                            newProject.tcFields = [];
                            window.down("#tcFields").store.each(function(item){
                                newProject.tcFields.push(item.data);
                            });
                            if(me.newProject == true){
                                Ext.data.StoreManager.lookup('Projects').add(newProject);
                            }
                            else{
                                var projectRecord = Ext.data.StoreManager.lookup('Projects').query("name",me.dataRecord.get("name")).getAt(0);
                                projectRecord.dirty = true;
                                projectRecord.set("tcFields",newProject.tcFields);
                            }
                            Ext.data.StoreManager.lookup('Projects').sync();
                            window.close();
                        }
                    }
                },
                {
                    text: 'Cancel',
                    handler: function() {
                        this.up('form').up('window').close();
                    }
                }],

            items: [{
                xtype:'textfield',
                itemId:"name",
                afterLabelTextTpl: this.requiredText,
                fieldLabel: 'Project Name',
                name: 'name',
                vtype:'projectName',
                allowBlank: false,
                maxLength: 20,
                enforceMaxLength:true,
                listeners: {
                    specialkey: function(field, e){
                        if (e.getKey() == e.ENTER) {
                            this.up('form').down("#submit").handler();
                        }
                    }
                }
             },
                {
                    xtype:'combo',
                    fieldLabel: 'Language',
                    store: ["Java/Groovy"],
                    value:"Java/Groovy",
                    name: 'language',
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    hidden: true,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                }
                ,
                {
                    xtype:'combo',
                    fieldLabel: 'Project Template',
                    store: ["Default","Java Based Selenium"],
                    name: 'template',
                    value:"Default",
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                },
                {
                    xtype:"text",
                    text:"Test Case Custom Fields:"
                }
                ,{
                    xtype:'customfields',
                    itemId:"tcFields",
                    dataRecordName: "tcFields",
                    dataRecord:me.dataRecord,
                    fieldLabel:'Test Case Custom Fields'
                }
            ]
        };
        this.callParent(arguments);
        if (this.newProject == false){
            this.down('form').getForm().findField("name").setValue(me.dataRecord.get("name"));
            this.down('form').getForm().findField("name").setDisabled(true);
            this.down('form').getForm().findField("template").setValue(me.dataRecord.get("template"));
            this.down('form').getForm().findField("template").setDisabled(true);
        }
        this.down('form').getForm().findField("name").focus();
    }

});


Ext.define('Redwood.view.CustomfFelds',{
    extend: 'Ext.grid.Panel',
    alias: "widget.customfields",
    selType: 'rowmodel',
    autoHeight:true,
    dataRecord:null,
    dataRecordName:"",


    initComponent: function () {
        var me = this;
        var records = [];
        if(me.dataRecord && me.dataRecord.data[me.dataRecordName] != ""){
            records = me.dataRecord.data[me.dataRecordName];
        }
        this.rowEditor = null;
        this.rowEditor = Ext.create('Ext.grid.plugin.RowEditing', {
            autoCancel: false,
            clicksToEdit: 2
        });
        this.DnD = Ext.create("Ext.grid.plugin.DragDrop",{
            dragText: 'Drag and drop to reorganize'
        });
        this.store =  new Ext.data.Store({
            //groupField: 'status',
            sorters: [{
                property : 'name'
            }],
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'possiblevalues',     type: 'array'},
                {name: 'required',     type: 'boolean'},
                {name: 'fieldtype',     type: 'string'}
            ],
            data: []
        });

        this.viewConfig ={
            markDirty: false,
            plugins:[this.DnD]
        };

        this.plugins =[this.rowEditor];

        this.rowEditor.on("edit",function(editor,e,eOpt){
        });
        this.rowEditor.on("beforeedit",function(editor,e){
            //e.grid.columns[2].getEditor().store.removeAll();
            //e.record.get("possiblevalues").forEach(function(item){
            //    e.grid.columns[2].getEditor().store.add({value:item,text:Ext.util.Format.htmlEncode(item)});
            //});
        });
        this.rowEditor.on('validateedit', function (editor, e) {
            //if ((Ext.encode(e.newValues) === Ext.encode(e.originalValues) )) {
            //    return false;
           // }
            //this.grid.down("#addParameter").setDisabled(true);
        });


        this.rowEditor.on('canceledit', function (editor, e) {
            //if (e.grid.columns[0].getEditor().validate() == false) {
            //    e.grid.store.removeAt(e.rowIdx);
            //}
            //this.grid.down("#addParameter").setDisabled(false);
        });

        this.columns = [
            {
                xtype: 'checkcolumn',
                header: "Required",
                dataIndex: 'required',
                width: 60,
                editor:{
                    xtype:'checkboxfield'
                },
                listeners:{
                    checkchange: function(){
                        //variablesEditor.fireEvent("edit");
                    }
                }
            },
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                sortable: false,
                width: 150,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false,
                    maskRe: /[^<]/,
                    listeners:{
                        validitychange: function(field,isValid){
                            //me.rowEditor.editor.onFieldChange();
                        },
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: "Field Type",
                sortable: false,
                dataIndex: "fieldtype",
                width:140,
                editor: {
                    xtype: "combo",
                    //width: 240,
                    store: Ext.create('Ext.data.Store', {
                        autoSync: true,
                        autoLoad: true,
                        fields: [{name:"value",type:"string"}],
                        data :[{value:"Text Field"},{value:"ComboBox"},{value:"ComboBox Select Only"}]
                    }),
                    displayField:"value",
                    valueField:"value",
                    value: "Text Field",
                    //queryMode: "local",
                    //name: 'status',
                    //itemId: 'status',
                    forceSelection: true,
                    editable: true,
                    allowBlank: false
                }
            },
            {
                header: 'Possible Values',
                dataIndex: 'possiblevalues',
                sortable: false,
                //width: 350,
                flex: 1,
                maxWidth:915,
                renderer: function (value, meta, record) {
                    return Ext.util.Format.htmlEncode(value);
                },
                editor: {
                    xtype:"combofieldgridbox",
                    //fieldLabel: 'Enter Tags',
                    dataIndex: 'possiblevalues',
                    grid: me,
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
                }
            },
            {
                xtype: 'actioncolumn',
                menuDisabled:true,
                sortable: false,
                width: 75,
                items: [
                    {
                        icon: 'images/edit.png',
                        tooltip: 'Edit',
                        handler: function(grid, rowIndex, colIndex) {
                            grid = this.up("customfields");
                            var store = grid.store;
                            var record = store.getAt(rowIndex);
                            if(record) {
                                grid.rowEditor.startEdit(record, grid.columns[1]);
                            }
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            grid = this.up("customfields");
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
        ];

        if(this.dataRecord != null){
            records.forEach(function(record){
                me.store.add(record);
            })
        }
        this.callParent(arguments);
    },

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
                text: 'Add Field',
                itemId: "addField",
                handler: function(){
                    var grid = this.up("customfields");
                    if(grid.rowEditor.editing)
                        return false;

                    // add blank item to store -- will automatically add new row to grid
                    var blank = grid.store.add({
                        required: false,
                        name: 'New Field',
                        possiblevalues:[],
                        fieldtype:"Text Field",
                        id:Ext.uniqueId()
                    })[0];

                    grid.rowEditor.startEdit(blank, grid.columns[1]);
                    //grid.machinesEditor.getDockedComponent('top').getComponent('add').setDisabled(true);
                }
            }
        ]
    },
    listeners:{
    }

});
