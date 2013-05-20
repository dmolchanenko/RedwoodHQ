Ext.require([
    'Redwood.view.ActionCollection'
]);

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
        {type: 'string', name: 'value'},
        {type: 'string', name: 'text'}
    ]
});

var possibleValues = function(data){
    return Ext.create('Ext.data.ArrayStore', {
        model: 'ValidValues',
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

Ext.apply(Ext.form.field.VTypes, {
    //  vtype validation function
    paramTest: function(val, field) {

        var store = field.ownerCt.editingPlugin.grid.store;
        var index = store.findExact(field.name,val);
        if (index != -1){
            var foundID = store.getAt(index).internalId;
            if (field.ownerCt.form.getRecord().internalId != foundID){
                this.paramTestText = "Parameter name should be unique.";
                return false;
            }
        }
        return true;
    },
    paramTestText: 'Parameter name should be unique.'
});


Ext.define('Redwood.view.ActionParamGrid',{
    extend: 'Ext.grid.Panel',
    alias: "widget.actionparamgrid",
    selType: 'rowmodel',
    autoHeight:true,


    initComponent: function () {
        var me = this;
        this.rowEditor = null;
        this.rowEditor = Ext.create('Ext.grid.plugin.RowEditing', {
            autoCancel: false,
            clicksToEdit: 2
        });
        this.store= Ext.create('Ext.data.ArrayStore', {
            model: 'ActionParams',
            autoSync: true,
            data: [],
            listeners:{
                datachanged: function(){
                    var actionView = me.up("actionview");
                    if (actionView){
                        if (actionView.loadingData === false){
                            actionView.markDirty();
                        }
                    }
                }
            }
        });
        this.plugins =[this.rowEditor];

        this.rowEditor.on("edit",function(editor,e,eOpt){
        });
        this.rowEditor.on("beforeedit",function(editor,e){
            e.grid.columns[2].getEditor().store.removeAll();
            e.record.get("possiblevalues").forEach(function(item){
                e.grid.columns[2].getEditor().store.add({value:item,text:Ext.util.Format.htmlEncode(item)});
            });
        });
        this.rowEditor.on('validateedit', function (editor, e) {
            if ((Ext.encode(e.newValues) === Ext.encode(e.originalValues) )) {
                return false;
            }
            //this.grid.down("#addParameter").setDisabled(true);
        });


        this.rowEditor.on('canceledit', function (editor, e) {
            if (e.grid.columns[0].getEditor().validate() == false) {
                e.grid.store.removeAt(e.rowIdx);
            }
            //this.grid.down("#addParameter").setDisabled(false);
        });

        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 350,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false,
                    vtype: "paramTest",
                    maskRe: /[^<]/,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
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
                maxWidth:915,
                renderer: function (value, meta, record) {
                    return Ext.util.Format.htmlEncode(value);
                },
                editor: Ext.create('Ext.ux.ComboFieldBox', {
                    typeAhead:true,
                    displayField:"text",
                    descField:"text",
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
                menuDisabled:true,
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
        ];

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
                text: 'Add Parameter',
                itemId: "addParameter",
                handler: function(){
                    var grid = this.up("actionparamgrid");
                    if(grid.rowEditor.editing)
                        return false;

                    // add blank item to store -- will automatically add new row to grid
                    var blank = grid.store.add({
                        name: 'New Parameter',
                        possiblevalues:[],
                        parametertype:"String",
                        id:Ext.uniqueId()
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
    //autoScroll: true,
    overflowY: 'auto',
    bodyPadding: 5,
    //type: 'auto',
    //align : 'stretch',
    //pack  : 'start',
    //forceFit: true,
    myData:[],
    dataRecord: null,
    dirty: false,
    loadingData: false,

    initComponent: function () {
        var formId = Ext.uniqueId();
        var me = this;

        this.markDirty = function(){
            this.dirty = true;
            if(me.title.charAt(me.title.length-1) != "*"){
                me.setTitle(me.title+"*")
            }
        };
        me.on("beforeclose",function(panel){
            if (this.dirty == true){
                var me = this;
                Ext.Msg.show({
                    title:'Save Changes?',
                    msg: 'You are closing a tab that has unsaved changes. Would you like to save your changes?',
                    buttons: Ext.Msg.YESNOCANCEL,
                    icon: Ext.Msg.QUESTION,
                    fn: function(id){
                        if (id == "no"){
                            me.destroy();
                        }
                        if (id == "yes"){
                            var editor = me.up('actions');
                            editor.fireEvent('saveAction');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        });
        this.items = [
            {
                xtype: 'fieldset',
                title: 'Action Details',
                defaultType: 'textfield',
                flex: 1,
                itemId:"actionDetails",
                //layout:"hBox",
                //align : 'stretch',
                //pack  : 'start',
                //width: 1500,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items: [
                    {
                        fieldLabel: "Name",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"name",
                        anchor:'90%',
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    },
                    {
                        fieldLabel: "Description",
                        allowBlank: true,
                        itemId:"description",
                        anchor:'90%',
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    }
                    ,
                    {
                        xtype: "radiogroup",
                        fieldLabel:"Action Type",
                        labelStyle: "font-weight: bold",
                        itemId:"type",
                        allowBlank:false,
                        width:200,
                        items:[
                            { boxLabel: 'Script', name:"type",inputValue: 'script',width:70,checked: true,formId:formId},
                            { boxLabel: 'Action Collection',name:"type", inputValue: 'collection',width:200,formId:formId}
                        ]
                        ,
                        listeners: {
                            change: function(me,newVal,oldVal){
                                if(newVal.type == "script"){
                                    me.up("actionview").down("#actionCollectionFiledSet").hide();
                                    me.up("actionview").down("scriptPicker").show();
                                }else{
                                    me.up("actionview").down("#actionCollectionFiledSet").show();
                                    me.up("actionview").down("scriptPicker").hide();
                                }
                                if (me.up("actionview").loadingData === false){
                                    me.up("actionview").markDirty();
                                }

                            }
                        }
                    },
                    {
                        xtype: "combo",
                        width: 240,
                        afterLabelTextTpl: this.requiredText,
                        fieldLabel: 'Status',
                        store: ["To be Automated","Automated","Needs Maintenance"],
                        value: "To be Automated",
                        name: 'status',
                        itemId: 'status',
                        forceSelection: true,
                        editable: false,
                        allowBlank: false,
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    },
                    {
                        xtype:"combofieldbox",
                        typeAhead:true,
                        fieldLabel: "Tags",
                        displayField:"value",
                        descField:"value",
                        height:24,
                        anchor:'90%',
                        //labelWidth: 100,
                        forceSelection:false,
                        createNewOnEnter:true,
                        encodeSubmitValue:true,
                        autoSelect: true,
                        createNewOnBlur: true,
                        store:Ext.data.StoreManager.lookup('ActionTags'),
                        valueField:"value",
                        queryMode: 'local',
                        //maskRe: /[a-z0-9-_]+$/,
                        maskRe: /[a-z_0-9]/,
                        removeOnDblClick:true,
                        itemId:"tag",
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    }
                ]
            },
            /*
            {

                xtype: 'fieldset',
                title: 'Parameters',
                flex: 1,
                /*
                layout:"hbox",
                align : 'stretch',
                pack  : 'start',
                anchor:"99%",

                collapsible: true,
                items:[
                 */
                    {
                        xtype:"actionparamgrid",
                        flex: 1,
                        itemId: "params",
                        padding: "0 10 10 2"

                    },
            //    ]
            //},
            {
                xtype: 'fieldset',
                hidden: true,
                title: 'Action Collection',
                flex: 1,

                layout:"hbox",
                //align : 'stretchmax',
                //pack: "center",
                constrainAlign: true,
                //maxWidth: 1672,

                collapsible: true,
                itemId:"actionCollectionFiledSet",
                items:[
                    {
                        xtype:"actioncollection",
                        //anchor:"100%",
                        flex: 1,
                        listeners:{
                            afterrender: function(collection){
                                var actionView = collection.up("actionview");
                                if(actionView.dataRecord != null){
                                    collection.parentActionID = actionView.dataRecord.get("_id");
                                }
                                collection.parentActionParamsStore = actionView.down("actionparamgrid").store;
                                collection.parentPanel = actionView;
                                collection.markDirty = function(){me.markDirty()}
                            }
                        }
                    }
                ]
            },
            {
                xtype: "scriptPicker",
                hidden: false,
                width: 700,
                listeners: {
                    change: function(){
                        if (me.loadingData == false){
                            me.markDirty();
                        }
                    }
                }
            }
        ];

        this.callParent(arguments);
    },
    listeners:{
        afterrender: function(me){
            me.loadingData = true;
            if (me.dataRecord != null){
                me.down("#name").setValue(me.dataRecord.get("name"));
                me.down("#tag").setValue(me.dataRecord.get("tag"));
                me.down("#status").setValue(me.dataRecord.get("status"));
                me.down("#description").setValue(me.dataRecord.get("description"));
                me.down("#type").setValue({type:me.dataRecord.get("type")});
                me.down("scriptPicker").setValue(me.dataRecord.get("script"));
                me.dataRecord.get("params").forEach(function(item){
                    me.down("#params").store.add(item);
                });

                me.down("actioncollection").loadCollection(me.dataRecord.get("collection"));

            }
            else{
                me.down("actioncollection").loadCollection("");
            }
            me.loadingData = false;
            this.down("#name").focus();
        }
    },

    validate: function(store){
        if (this.down("#name").validate() == false){
            this.down("#name").focus();
            return false;
        }
        var index = store.findExact("name",this.down("#name").getValue());
        if (this.dataRecord != null){
            if (index != -1){
                var foundID = store.getAt(index).internalId;
                if (this.dataRecord.internalId != foundID){
                    this.down("#name").focus();
                    Ext.Msg.alert('Error', "Action with the same name already exits.");
                    return false;
                }
            }
        }
        else{
            if (index != -1){
                this.down("#name").focus();
                Ext.Msg.alert('Error', "Action with the same name already exits.");
                return false;
            }
        }

        if (this.down("#status").getValue() == "Automated"){
            if (this.down("#type").getValue().type == "script"){

                if (this.down("scriptPicker").getValue() == ""){
                    this.down("scriptPicker").focus();
                    Ext.Msg.alert('Error', "You must select script for this action.");
                    return false;
                }
            }
            else{
                if (this.down("actioncollection").getCollectionData().length == 0){
                    Ext.Msg.alert('Error', "You must add actions to action collection.");
                    return false;
                }
            }
        }

    },

    getActionData: function(){
        var action = {};
        action.name = this.down("#name").getValue();
        action.tag = this.down("#tag").getValue();
        action.status = this.down("#status").getValue();
        action.type = this.down("#type").getValue().type;
        action.description = this.down("#description").getValue();
        action.script = this.down("scriptPicker").getValue();

        var paramStore = this.down("#params").store;
        action.params = [];
        var storeData = paramStore.getRange(0,paramStore.getCount()-1);
        storeData.forEach(function(item){
            action.params.push(item.data);
        });
        action.collection = this.down("actioncollection").getCollectionData();
        return action;
    }

});