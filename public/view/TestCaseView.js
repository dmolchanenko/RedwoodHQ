Ext.require([
    'Redwood.view.ActionCollection','Redwood.view.TestCaseData'
]);

Ext.define('Redwood.view.TestCaseView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testcaseview',
    overflowY: 'auto',
    bodyPadding: 5,
    myData:[],
    dataRecord: null,
    dirty: false,
    loadingData: false,

    initComponent: function () {
        var formId = Ext.uniqueId();
        var me = this;

        this.markDirty = function(){
            if(this.dataRecord && this.dataRecord.get("history") == true){
                return;
            }
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
                            var editor = me.up('testcases');
                            editor.fireEvent('saveTestCase');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        });



        /*
        var descResizer = Ext.create('Ext.resizer.Resizer', {
            target: 'elToResize',
            handles: 'all',
            minWidth: 200,
            minHeight: 100,
            maxWidth: 500,
            maxHeight: 400,
            pinned: true
        });
        */

        this.items = [
            {
                xtype: 'fieldset',
                title: 'Test Case Details',
                defaultType: 'textfield',
                itemId:"testcaseDetails",
                flex: 1,
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
                        xtype: "htmleditor",
                        fieldLabel: "Description",
                        allowBlank: true,
                        margin: "0 0 7 0",
                        itemId:"description",
                        height: 180,
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
                        store:Ext.data.StoreManager.lookup('TestCaseTags'),
                        valueField:"value",
                        queryMode: 'local',
                        maskRe: /[a-z_0-9_A-Z_-]/,
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
                    ,
                    {
                        xtype: "radiogroup",
                        fieldLabel:"Test Case Type",
                        labelStyle: "font-weight: bold",
                        itemId:"type",
                        allowBlank:false,
                        width:200,
                        items:[
                            { boxLabel: 'Junit', name:"type",inputValue: 'junit',width:70,checked: false,formId:formId},
                            { boxLabel: 'TestNG', name:"type",inputValue: 'testng',width:70,checked: false,formId:formId},
                            { boxLabel: 'Script', name:"type",inputValue: 'script',width:70,checked: false,formId:formId},
                            { boxLabel: 'Action Collection',name:"type", inputValue: 'collection',checked:true,width:200,formId:formId}
                        ]
                        ,
                        listeners: {
                            change: function(me,newVal,oldVal){
                                if(newVal.type == "script" || newVal.type == "junit" || newVal.type == "testng" ){
                                    me.up("testcaseview").down("#actionCollectionFiledSet").hide();
                                    me.up("testcaseview").down("#testcaseData").hide();
                                    me.up("testcaseview").down("#afterState").hide();
                                    me.up("testcaseview").down("scriptPickerView").show();
                                }else{
                                    me.up("testcaseview").down("#actionCollectionFiledSet").show();
                                    me.up("testcaseview").down("#testcaseData").show();
                                    me.up("testcaseview").down("#afterState").show();
                                    me.up("testcaseview").down("scriptPickerView").hide();
                                }
                                if (me.up("testcaseview").loadingData === false){
                                    me.up("testcaseview").markDirty();
                                }

                            }
                        }
                    },
                    {
                        xtype: "actionpicker",
                        fieldLabel:"After State",
                        itemId:"afterState",
                        hidden:true,
                        //width: 400,
                        anchor:'90%',
                        plugins:[
                            Ext.create('Ext.ux.SearchPlugin')
                        ],
                        paramNames:["tag","name"],
                        store: Ext.data.StoreManager.lookup('ActionsCombo'),
                        autoSelect:true,
                        forceSelection:false,
                        queryMode: 'local',
                        triggerAction: 'all',
                        lastQuery: '',
                        typeAhead: false,
                        displayField: 'name',
                        valueField: '_id',
                        listeners:{
                            afterrender: function(picker){
                                picker.store.clearFilter(true);
                            },
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }

                            }
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'History',
                defaultType: 'textfield',
                itemId: "testcaseHistory",
                flex: 1,
                hidden:false,
                collapsible: true,
                collapsed:true,
                layout: "fit",
                defaults: {
                    flex: 1
                },
                items: [

                ]
            },
            {
                xtype: 'fieldset',
                title: 'Test Case Fields',
                defaultType: 'textfield',
                itemId: "testcaseFields",
                flex: 1,
                hidden:true,
                collapsible: true,
                //layout: "column",
                defaults: {
                    flex: 1
                },
                items: []
            },
            {
                xtype: 'fieldset',
                hidden: false,
                title: 'After State',
                flex: 1,
                collapsed:true,
                layout:"hbox",
                //height:400,
                constrainAlign: true,

                collapsible: true,
                itemId:"afterStateFiledSet",
                items:[
                    {
                        xtype:"actioncollection",
                        itemId:"afterStateCollection",
                        flex: 1,
                        height:400,
                        listeners:{
                            afterrender: function(collection){
                                collection.parentPanel = me;
                                collection.markDirty = function(){me.markDirty()}
                            }
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                hidden: false,
                title: 'Action Collection',
                flex: 1,

                layout:"hbox",
                constrainAlign: true,

                collapsible: true,
                itemId:"actionCollectionFiledSet",
                items:[
                    {
                        xtype:"actioncollection",
                        itemId:"actionCollection",
                        flex: 1,
                        listeners:{
                            afterrender: function(collection){
                                collection.parentPanel = me;
                                collection.markDirty = function(){me.markDirty()}
                            }
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Test Case Data',
                itemId: "testcaseData",
                flex: 1,
                hidden:false,
                collapsible: true,
                //layout: "column",
                defaults: {
                    flex: 1
                },
                items: [
                    {
                        xtype:"testcasedata",
                        listeners:{
                            afterrender: function(tcdata){
                                tcdata.parentPanel = me;
                                tcdata.markDirty = function(){me.markDirty()}
                            }
                        }
                    }
                ]
            },
            {
                xtype: "scriptPickerView",
                hidden: true,
                width: 955,
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
            /*
            var project = Ext.data.StoreManager.lookup('Projects').query("name",Ext.util.Cookies.get('project')).getAt(0);
            if(project.get("tcFields")){
                var rows = 1;
                var columns = 2;
                var currentRow;
                var fields = [];
                project.get("tcFields").forEach(function(field,index){
                    if((index+1) % columns > 0){
                        currentRow = new Ext.container.Container({
                            layout:"column"
                        });
                        me.down("#testcaseFields").add(currentRow);
                    }
                    var blank = true;
                    if(field.required == true) blank = false;
                    if(field.fieldtype == "Text Field"){
                        currentRow.add({
                            xtype: "textfield",
                            padding: "5 5 5 5",
                            columnWidth: 0.5,
                            fieldLabel: field.name,
                            allowBlank: blank,
                            //labelStyle: "font-weight: bold",
                            anchor:'90%',
                            listeners:{
                                change: function(){
                                    if (me.loadingData === false){
                                        me.markDirty();
                                    }
                                }
                            }
                        })
                    }
                    else  if(field.fieldtype == "ComboBox"){
                        currentRow.add({
                            xtype: "combo",
                            padding: "5 5 5 5",
                            columnWidth: 0.5,
                            //width: 240,
                            //afterLabelTextTpl: this.requiredText,
                            fieldLabel: field.name,
                            store: field.possiblevalues,
                            //value: "To be Automated",
                            //name: 'status',
                            //forceSelection: true,
                            //editable: false,
                            allowBlank: blank,
                            listeners:{
                                change: function(){
                                    if (me.loadingData === false){
                                        me.markDirty();
                                    }
                                }
                            }
                        })
                    }
                    /*
                    if(field.fieldtype == "Text Field"){
                        me.down("#testcaseFields").add({
                            xtype: "textfield",
                            padding: "5 0 5 5",
                            //columnWidth: 0.5,
                            fieldLabel: field.name,
                            allowBlank: field.required,
                            labelStyle: "font-weight: bold",
                            anchor:'90%',
                            listeners:{
                                change: function(){
                                    if (me.loadingData === false){
                                        me.markDirty();
                                    }
                                }
                            }
                        })
                    }


                });
            }
            */
            //me.down("#testcaseFields").add([{text:'Button 1',columnWidth: 1/3, padding: "5 0 5 5"}, {text:'Button 1',columnWidth: 1/3, padding: "5 0 5 5"},{text:'Button 1',columnWidth: 1/3, padding: "5 0 5 5"},{text:'Button 1',columnWidth: 1/3, padding: "5 0 5 5"}]);
            if (me.dataRecord != null){
                me.down("#name").setValue(me.dataRecord.get("name"));
                me.down("#tag").setValue(me.dataRecord.get("tag"));
                me.down("#status").setValue(me.dataRecord.get("status"));
                me.down("#description").setValue(me.dataRecord.get("description"));
                me.down("#type").setValue({type:me.dataRecord.get("type")});
                me.down("#scriptPath").setValue(me.dataRecord.get("script"));
                if(me.dataRecord.get("scriptLang")){
                    me.down("#scriptLang").setValue(me.dataRecord.get("scriptLang"));
                }
                else{
                    me.down("#scriptLang").setValue("Java/Groovy");
                }
                me.down("#actionCollection").loadCollection(me.dataRecord.get("collection"));

                //take care of old after state format and transfer to new
                if(Array.isArray(me.dataRecord.get("afterState"))){
                    me.down("#afterStateCollection").loadCollection(me.dataRecord.get("afterState"));
                }
                else {
                    me.down("#afterStateCollection").loadCollection([{actionid:me.dataRecord.get("afterState"),executionflow:"Record Error Stop Test Case",host:"Default",order:"1",parameters:[],returnvalue:""}]);
                }
                me.down("testcasedata").loadData(me.dataRecord.get("tcData"));
                //me.down("#afterState").setValue(me.dataRecord.get("afterState"));
                me.down("#testcaseDetails").collapse();

                me.historyStore =  Ext.create('Ext.data.Store', {
                    model: 'Redwood.model.TestCases',
                    autoLoad: true,
                    storeId: "TCHistoryStore"+me.dataRecord.get("_id"),
                    idProperty: '_id',
                    proxy: {
                        type: 'rest',
                        url: '/testcasehistory/'+me.dataRecord.get("_id"),
                        reader: {
                            type: 'json',
                            root: 'testcases',
                            successProperty: 'success'
                        }
                    },
                    sorters: [{
                        property : 'date',
                        direction: 'DESC'
                    }]
                });

                //add history specific fields
                me.historyStore.model.prototype.fields.add(new Ext.data.Field({ name: 'user', type: 'string'}));
                me.historyStore.model.prototype.fields.add(new Ext.data.Field({ name: 'date', type: 'date'}));
                me.historyGrid = Ext.create('Ext.grid.Panel', {
                    store: me.historyStore,
                    itemId:"historyGrid",
                    selType: 'rowmodel',
                    height:200,
                    viewConfig: {
                        markDirty: false,
                        enableTextSelection: true
                    },
                    plugins: [
                        "bufferedrenderer"],
                    columns:[
                        {
                            xtype:"datecolumn",
                            format:'m/d h:i:s',
                            header: 'Date',
                            dataIndex: 'date',
                            width: 120
                        },
                        {
                            header: 'UserID',
                            dataIndex: 'user',
                            width: 180
                        },
                        {
                            header: 'Previous Version',
                            dataIndex: '_id',
                            renderer: function(value,meta,record){
                                //meta.tdCls = 'x-redwood-results-cell';
                                return "<a style= 'color:font-weight:bold;blue;' href='javascript:openTestCaseHistory(&quot;"+ me.dataRecord.get("_id") +"&quot;,&quot;" + value + "&quot;)'>View Test Case</a>"
                            }
                        },
                        {
                            xtype: 'actioncolumn',
                            icon: 'images/undo.png',
                            width: 40,
                            tooltip: 'Revert to this version.',
                            handler: function(grid, rowIndex, colIndex) {
                                Ext.Msg.show({
                                    title:'Revert to version.',
                                    msg: 'Are you sure you want to revert test case to this version?',
                                    buttons: Ext.Msg.YESNO,
                                    icon: Ext.Msg.QUESTION,
                                    fn: function(id){
                                        if (id == "yes"){
                                            var controller = Redwood.app.getController("TestCases");
                                            controller.onRevert(grid.store.getAt(rowIndex).get("_id"));
                                            me.close();
                                        }
                                    }
                                });
                            }
                        }

                    ]

                });
                if(me.dataRecord.get("history") == true){
                    me.down("#testcaseHistory").hide();
                }
                else{
                    me.down("#testcaseHistory").items.add(me.historyGrid);
                }


            }
            else{
                me.down("#actionCollection").loadCollection("");
                me.down("#afterStateCollection").loadCollection("");
            }
            setTimeout(function(){me.loadingData = false;},500);
            me.down("#name").focus();
        }
    },

    validate: function(store){
        if (this.down("#name").validate() == false){
            this.down("#name").focus();
            return false;
        }
        var record = store.query("name",this.down("#name").getValue(),false,true,true).getAt(0);
        //findExact("name",this.down("#name").getValue());
        if (this.dataRecord != null){
            if (record){
                var foundID = record.internalId;
                if (this.dataRecord.internalId != foundID){
                    this.down("#name").focus();
                    Ext.Msg.alert('Error', "Test Case with the same name already exits.");
                    return false;
                }
            }
        }
        else{
            if (record){
                this.down("#name").focus();
                Ext.Msg.alert('Error', "Test Case with the same name already exits.");
                return false;
            }
        }

        /*
        var afterStateValue = this.down("#afterState").getValue();
        if((afterStateValue != null) && (afterStateValue != "")){
            var action = Ext.data.StoreManager.lookup('Actions').query("_id",this.down("#afterState").getValue()).getAt(0);
            if(!action){
                this.down("#afterState").focus();
                Ext.Msg.alert('Error', "After state has to be a valid action.");
                return false;
            }
        }
        */

        if (this.down("#status").getValue() == "Automated"){
            if (this.down("#type").getValue().type == "script" || this.down("#type").getValue().type == "junit" || this.down("#type").getValue().type == "testng"){

                if (this.down("#scriptPath").getValue() == ""){
                    this.down("#scriptPath").focus();
                    Ext.Msg.alert('Error', "You must select script for this action.");
                    return false;
                }
            }
            else{
                if (this.down("#actionCollection").getCollectionData().length == 0){
                    Ext.Msg.alert('Error', "You must add actions to action collection.");
                    return false;
                }
            }
        }

    },

    getTestCaseData: function(){
        var testcase = {};
        testcase.name = this.down("#name").getValue();
        testcase.tag = this.down("#tag").getValue();
        testcase.status = this.down("#status").getValue();
        testcase.description = this.down("#description").getValue();
        testcase.type = this.down("#type").getValue().type;
        testcase.script = this.down("#scriptPath").getValue();
        testcase.scriptLang = this.down("#scriptLang").getValue();
        //testcase.afterState = this.down("#afterState").getValue();
        testcase.afterState = this.down("#afterStateCollection").getCollectionData();


        testcase.collection = this.down("#actionCollection").getCollectionData();
        testcase.tcData = this.down("testcasedata").getTestCaseData();
        return testcase;
    }

});