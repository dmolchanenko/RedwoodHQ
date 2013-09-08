
Ext.define('Redwood.view.ExecutionView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.executionview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    dirty: false,
    loadingData: true,
    viewType: "Execution",
    noteChanged: false,

    initComponent: function () {
        var me = this;
        if (me.dataRecord == null){
            me.itemId = Ext.uniqueId();
        }
        else{
            me.itemId = me.dataRecord.get("_id");
        }

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
                            var editor = me.up('executionsEditor');
                            editor.fireEvent('save');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        });

        var variables = [];
        var variablesStore = Ext.data.StoreManager.lookup('Variables');
        variablesStore.each(function(variable){
            var foundVarValue = variable.get("value");
            if (me.dataRecord != null){
                me.dataRecord.get("variables").forEach(function(recordedVariable){
                    if(recordedVariable._id === variable.get("_id")){
                        foundVarValue = recordedVariable.value;
                    }
                })
            }
            if (variable.get("taskVar") == true){
                variables.push({possibleValues:variable.get("possibleValues"),tag:variable.get("tag"),value:foundVarValue,name:variable.get("name"),_id:variable.get("_id")})
            }
        });

        var linkedVarStore =  new Ext.data.Store({
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'value',     type: 'string'},
                {name: 'tag',     type: 'array'},
                {name: 'possibleValues',     type: 'array'},
                {name: '_id',     type: 'string'}
            ],
            data: variables,
            listeners:{
                update:function(){
                    if (me.loadingData === false){
                        me.markDirty();
                    }
                }
            }
        });

        me.variablesListener = function(options,eOpts){
            if (options.create){
                options.create.forEach(function(variable){
                    if (variable.get("taskVar") == true){
                        linkedVarStore.add(variable);
                    }
                });
            }
            if (options.destroy){
                options.destroy.forEach(function(variable){
                    if (variable.get("taskVar") == true){
                        linkedVarStore.remove(linkedVarStore.findRecord("_id", variable.get("_id")));
                    }
                });
            }
            if (options.update){
                options.update.forEach(function(variable){
                    var linkedRecord = linkedVarStore.findRecord("_id", variable.get("_id"));
                    if (variable.get("taskVar") == true){
                        //if null it means the taskVar flag changed and we need to add instead of update
                        if (linkedRecord == null){
                            linkedVarStore.add(variable);
                            return;
                        }
                        linkedRecord.set("name", variable.get("name"));
                        linkedRecord.set("tag", variable.get("tag"));
                        linkedRecord.set("possibleValues", variable.get("possibleValues"));
                    }
                    //looks like the variable no longer belongs here
                    else if(linkedRecord != null){
                        linkedVarStore.remove(linkedRecord);
                    }
                });
            }
        };

        variablesStore.on("beforesync",me.variablesListener);

        var variablesGrid = new Ext.grid.Panel({
            listeners:{
                afterrender: function(me){
                    me.down("#varValue").setEditor(Ext.create('Ext.ux.ComboGridBox', {
                        typeAhead: true,
                        displayField: 'text',
                        queryMode: 'local',
                        valueField:'value',
                        grid: me,
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
                    }))
                }
            },
            store: linkedVarStore,
            itemId:"executionVars",
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false
            },
            plugins: [
                Ext.create('Ext.grid.plugin.CellEditing', {
                clicksToEdit: 1
            })],

            minHeight: 150,
            manageHeight: true,
            flex: 1,
            columns:[
                {
                    header: 'Name',
                    dataIndex: 'name',
                    width: 200
                },
                {
                    header: 'Value',
                    dataIndex: 'value',
                    itemId: "varValue",
                    renderer:function(value, meta, record){
                        return Ext.util.Format.htmlEncode(value);
                    },
                    //width: 500,
                    flex: 1
                },
                {
                    header: 'Tags',
                    dataIndex: 'tag',
                    //flex: 1,
                    width: 250
                }
            ]

        });

        var machines = [];
        var machinesStore = Ext.data.StoreManager.lookup('Machines');
        machinesStore.each(function(machine){
            //var foundMachine = false;
            var baseState = null;
            var baseStateTCID = null;
            var result = null;
            var resultID = null;
            var threads = 1;
            if ((me.dataRecord != null)&&(me.dataRecord.get("machines"))){
                me.dataRecord.get("machines").forEach(function(recordedMachine){
                    if(recordedMachine._id === machine.get("_id")){
                        baseState = recordedMachine.baseState;
                        baseStateTCID = recordedMachine.baseStateTCID;
                        result = recordedMachine.result;
                        resultID = recordedMachine.resultID;
                        if (recordedMachine.threads){
                            threads = recordedMachine.threads;
                        }
                        else{
                            threads = 1;
                        }
                    }
                })
            }
            if (baseStateTCID == null) baseStateTCID = Ext.uniqueId();
            machines.push({host:machine.get("host"),machineVars:machine.get("machineVars"),tag:machine.get("tag"),state:machine.get("state"),maxThreads:machine.get("maxThreads"),threads:threads,result:result,resultID:resultID,baseState:baseState,baseStateTCID:baseStateTCID,description:machine.get("description"),roles:machine.get("roles"),port:machine.get("port"),vncport:machine.get("vncport"),_id:machine.get("_id")})
        });

        var linkedMachineStore =  new Ext.data.Store({
            fields: [
                {name: 'host',     type: 'string'},
                {name: 'vncport',     type: 'string'},
                {name: 'port',     type: 'string'},
                {name: 'maxThreads',     type: 'int'},
                {name: 'threads',     type: 'int'},
                {name: 'tag',     type: 'array'},
                {name: 'state',     type: 'string'},
                {name: 'baseState',     type: 'string'},
                {name: 'resultID',     type: 'string'},
                {name: 'baseStateTCID',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'description',     type: 'string'},
                {name: 'machineVars',     type: 'array'},
                {name: 'roles',     type: 'array'},
                {name: '_id',     type: 'string'}
            ],
            data: machines,
            listeners:{
                update:function(store, record, operation, modifiedFieldNames){

                    if (me.loadingData === false){
                        if (modifiedFieldNames){
                            modifiedFieldNames.forEach(function(field){
                                if (field === "baseState"){
                                    me.markDirty();
                                }
                            });
                        }
                    }
                }
            }
        });

        me.machinesListener = function(options,eOpts){
            if (options.create){
                options.create.forEach(function(r){
                    r.set("threads",1);
                    linkedMachineStore.add(r);
                });
            }
            if (options.destroy){
                options.destroy.forEach(function(r){
                    if (r) linkedMachineStore.remove(linkedMachineStore.findRecord("_id", r.get("_id")));
                });
            }
            if (options.update){
                options.update.forEach(function(r){
                    var linkedRecord = linkedMachineStore.findRecord("_id", r.get("_id"));
                    linkedRecord.set("host", r.get("host"));
                    linkedRecord.set("maxThreads", r.get("maxThreads"));
                    linkedRecord.set("port", r.get("port"));
                    linkedRecord.set("vncport", r.get("vncport"));
                    linkedRecord.set("tag", r.get("tag"));
                    linkedRecord.set("description", r.get("description"));
                    linkedRecord.set("roles", r.get("roles"));
                    linkedRecord.set("state", r.get("state"));
                    linkedRecord.set("machineVars", r.get("machineVars"));
                    //me.down("#hostMachineColumn").renderer(linkedRecord.get("host"),null,linkedRecord)
                });
            }
        };

        machinesStore.on("beforesync", me.machinesListener);

        var machinesGrid = new Ext.grid.Panel({
            store: linkedMachineStore,
            itemId:"executionMachines",
            selType: 'rowmodel',
            tbar:{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    paramNames: ["tag","host","description","roles"],
                    store: linkedMachineStore
                }
            ]
            },
            viewConfig: {
                markDirty: false
            },
            plugins: [
                Ext.create('Ext.grid.plugin.CellEditing', {
                clicksToEdit: 1,
                listeners:{
                    beforeedit: function(editor,e){
                        if(e.field == "threads"){
                            machinesGrid.editingRecord = e.record;
                            //editor.setMaxValue(e.record.get("maxThreads"))
                        }
                    }
                }
            })],
            minHeight: 150,
            manageHeight: true,
            flex: 1,
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                singleSelect: false,
                sortable: true,
                //checkOnly: true,
                stateful: true,
                showHeaderCheckbox: true
            }),
            listeners:{
                edit: function(editor, e ){
                    machinesGrid.getSelectionModel().select([e.record]);
                }
            },
            columns:[
                {
                    header: 'Host Name/IP',
                    dataIndex: 'host',
                    itemId:"hostMachineColumn",
                    width: 200,
                    renderer: function (value, meta, record) {
                        return "<a style= 'color: blue;' href='javascript:vncToMachine(&quot;"+ value +"&quot;,&quot;"+ record.get("vncport") +"&quot;)'>" + value +"</a>";
                    }
                },
                {
                    header: 'Threads',
                    dataIndex: 'threads',
                    //flex: 1,
                    width: 100,
                    editor: {
                        xtype: 'numberfield',
                        allowBlank: false,
                        minValue: 1,
                        listeners:{
                            focus: function(field){
                                field.setMaxValue(machinesGrid.editingRecord.get("maxThreads"))
                            }
                        }
                    }
                },
                {
                    header: 'Max Threads',
                    dataIndex: 'maxThreads',
                    //flex: 1,
                    width: 100
                },
                {
                    header: 'Port',
                    dataIndex: 'port',
                    width: 100
                },
                {
                    header: 'Roles',
                    dataIndex: 'roles',
                    width: 200
                },
                {
                    header: 'State',
                    dataIndex: 'state',
                    width: 120,
                    renderer: function(value,record){
                        if (value.indexOf("Running") != -1){
                            return "<p style='color:green'>"+value+"</p>";
                        }
                        return value;
                    }
                },
                {
                    header: 'Description',
                    dataIndex: 'description',
                    flex: 1
                },
                {
                    header: "Base State Result",
                    dataIndex: "result",
                    width: 120,
                    renderer: function(value,style,record){
                        //style.tdAttr = 'data-qtip="' + record.get("error") + '"';
                        if((value == "") &&(record.get("resultID"))){
                            value = "Running";
                        }
                        if ((value == "Passed") || (value == "Running")){
                            return "<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + value +"</a>";
                            //return "<p style='color:green'>"+value+"</p>"
                        }
                        else if (value == "Failed"){
                            return "<a style= 'color: red;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + value +"</a>";
                            //return "<p style='color:red'>"+value+"</p>"
                        }
                        else{
                            return value;
                        }

                    }
                },
                {
                    header: 'Machine Base State',
                    dataIndex: "baseState",
                    width:200,
                    renderer:  function(value,metaData,record, rowIndex, colIndex, store, view){
                        if (value){
                            var action = Ext.data.StoreManager.lookup('Actions').getById(value);
                            if(action){
                                return action.get("name");
                            }
                            else{
                                record.set("baseState",null);
                                record.set("result",null);
                                return "";
                            }
                            var actionName = Ext.data.StoreManager.lookup('Actions').getById(value).get("name");
                            var url = "<a style= 'color: red;' href='javascript:openAction(&quot;"+ record.get("baseState") +"&quot;)'>" + actionName +"</a>";
                            return url;
                        }
                        else{
                            return value
                        }
                    },
                    editor: {
                        xtype: "actionpicker",
                        itemId: "actionpicker",
                        width: 400,
                        plugins:[
                            Ext.create('Ext.ux.SearchPlugin')
                        ],
                        paramNames:["tag","name"],
                        store: Ext.data.StoreManager.lookup('ActionsCombo'),
                        autoSelect:false,
                        forceSelection:false,
                        queryMode: 'local',
                        triggerAction: 'all',
                        lastQuery: '',
                        typeAhead: false,
                        displayField: 'name',
                        valueField: '_id'
                    }
                },
                {
                    header: 'Tags',
                    dataIndex: 'tag',
                    //flex: 1,
                    width: 250
                }
            ]

        });


        var executionTCStore =  new Ext.data.Store({
            storeId: "ExecutionTCs"+this.itemId,
            //groupField: 'status',
            sorters: [{

                property : 'name',
                direction: 'ASC'

            }],
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'tag',     type: 'array'},
                {name: 'status',     type: 'string'},
                {name: 'host',     type: 'string'},
                {name: 'vncport',     type: 'string'},
                {name: 'resultID',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'startAction',     type: 'string'},
                {name: 'endAction',     type: 'string'},
                {name: 'startdate',     type: 'date'},
                {name: 'enddate',     type: 'date'},
                {name: 'runtime',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: 'note',     type: 'string'},
                {name: '_id',     type: 'string'},
                {name: 'testcaseID',     type: 'string'}
            ],
            data: []
        });


        me.updateTotals = function(execution){
            me.down("#totalPassed").setRawValue(execution.passed);
            me.down("#totalFailed").setRawValue(execution.failed);
            me.down("#totalNotRun").setRawValue(execution.notRun);
            me.down("#totalTestCases").setRawValue(execution.total);
            me.down("#runtime").setRawValue(execution.runtime);

            me.chartStore.findRecord("name","Passed").set("data",execution.passed);
            me.chartStore.findRecord("name","Failed").set("data",execution.failed);
            me.chartStore.findRecord("name","Not Run").set("data",execution.notRun);

        };

        me.initialTotals = function(){
            if (me.dataRecord){
                me.down("#totalPassed").setRawValue(me.dataRecord.get("passed"));
                me.down("#totalFailed").setRawValue(me.dataRecord.get("failed"));
                me.down("#totalNotRun").setRawValue(me.dataRecord.get("notRun"));
                me.down("#totalTestCases").setRawValue(me.dataRecord.get("total"));
                me.down("#runtime").setRawValue(me.dataRecord.get("runtime"));

                me.chartStore.findRecord("name","Passed").set("data",me.dataRecord.get("passed"));
                me.chartStore.findRecord("name","Failed").set("data",me.dataRecord.get("failed"));
                me.chartStore.findRecord("name","Not Run").set("data",me.dataRecord.get("notRun"));
            }
            else{
                me.down("#totalPassed").setRawValue(0);
                me.down("#totalFailed").setRawValue(0);
                me.down("#totalNotRun").setRawValue(0);
                me.down("#totalTestCases").setRawValue(0);
                me.down("#runtime").setRawValue(0);
            }

        };

        executionTCStore.on("datachanged",function(store){
            //me.updateTotals(store);
        });

        executionTCStore.on("beforesync",function(options){
            if (options.update){
                //me.updateTotals(executionTCStore);
            }
        });

        var testcasesGrid = new Ext.grid.Panel({
            store: executionTCStore,
            itemId:"executionTestcases",
            selType: 'rowmodel',
            overflowY: 'auto',
            tbar:{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    {
                        width: 400,
                        fieldLabel: 'Search',
                        labelWidth: 50,
                        xtype: 'searchfield',
                        paramNames: ["name","tag"],
                        //paramNames: ["tempName","tag","status","result"],
                        store: executionTCStore
                    },"->",
                    {
                        icon: 'images/note_add.png',
                        tooltip:"Add Note to Selected Test Cases",
                        handler: function(){
                            if(testcasesGrid.getSelectionModel().getSelection().length == 0){
                                Ext.Msg.alert('Error', "Please select test cases you want to attach note to.");
                                return;
                            }
                            var win = Ext.create('Redwood.view.TestCaseNote',{
                                onNoteSave:function(note){
                                    testcasesGrid.getSelectionModel().getSelection().forEach(function(testcase){
                                        testcase.set("note",note);
                                        me.markDirty();
                                        me.noteChanged = true;
                                    });
                                }
                            });
                            win.show();
                        }
                    },"-","",
                    {
                        width: 400,
                        fieldLabel: 'Search Notes',
                        labelWidth: 80,
                        xtype: 'searchfield',
                        paramNames: ["note"],
                        //paramNames: ["tempName","tag","status","result"],
                        store: executionTCStore
                    }
                ]
            },
            viewConfig: {
                markDirty: false,
                enableTextSelection: true
            },
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                singleSelect: false,
                sortable: true,
                stateful: true,
                showHeaderCheckbox: true,
                listeners: {}
            }),
            minHeight: 150,
            height: 500,
            manageHeight: true,
            flex: 1,
            plugins: [
                "bufferedrenderer",
                Ext.create('Ext.grid.plugin.CellEditing', {
                    clicksToEdit: 1
            })],
            listeners:{
                edit: function(editor, e ){
                    if ((e.field == "endAction") &&(e.value != "") &&(e.record.get("startAction") == "")){
                        e.record.set("startAction",1);
                    }
                    testcasesGrid.getSelectionModel().select([e.record]);
                },
                cellclick: function(grid, td, cellIndex, record, tr, rowIndex, e ) {
                    if (cellIndex == 11){
                        var win = Ext.create('Redwood.view.TestCaseNote',{
                            value: record.get("note"),
                            onNoteSave:function(note){
                                record.set("note",note);
                                me.markDirty();
                                me.noteChanged = true;
                            }
                        });
                        win.show();
                    }
                }
            },
            columns:[
                {
                    header: 'Name',
                    dataIndex: 'name',
                    flex: 1,
                    renderer: function (value, meta, record) {
                        //if (record.get("status") == "Finished"){
                        //if (record.get("resultID")){
                        //    return "<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + value +"</a>";
                        //}
                        //else{
                        //    return value;
                        //}
                        //console.log(value);
                        if (record.get("resultID")){
                            //if(value.indexOf("<a style") == -1){
                                //record.set("tempName",value);
                                //record.set("name","<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + value +"</a>");
                            //}
                            //return value;
                            return "<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + value +"</a>";
                        }
                            //record.set("name")
                        return value;

                    }
                },
                {
                    header: 'Tags',
                    dataIndex: 'tag',
                    width: 200
                },
                {
                    header: 'Start Action',
                    dataIndex: 'startAction',
                    width: 100,
                    editor: {
                        xtype: 'textfield',
                        maskRe: /^\d+$/,
                        allowBlank: true,
                        listeners:{
                            focus: function(){
                                this.selectText();
                            }
                        }
                    }
                },
                {
                    header: 'End Action',
                    dataIndex: 'endAction',
                    width: 100,
                    editor: {
                        xtype: 'textfield',
                        maskRe: /^\d+$/,
                        allowBlank: true,
                        listeners:{
                            focus: function(){
                                this.selectText();
                            }
                        }
                    }
                },
                {
                    header: 'Status',
                    dataIndex: 'status',
                    width: 100,
                    renderer: function (value, meta, record) {
                        //if(record.get("resultID") != ""){
                        //    record.set("name","<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + record.get("tempName") +"</a>");
                        //}

                        if(record.get("host") && (value == "Running")){
                            return "<a style= 'color: blue;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;,&quot;"+ record.get("vncport") +"&quot;)'>" + value +"</a>";
                        }
                        else if (value == "Finished"){
                            return "<p style='color:green'>"+value+"</p>";
                        }
                        else if ( value == "Not Run"){
                            return "<p style='color:#ffb013'>"+value+"</p>";
                        }
                        else{
                            return value;
                        }
                    }
                },
                {
                    xtype:"datecolumn",
                    format:'m/d h:i:s',
                    header: 'Started',
                    dataIndex: 'startdate',
                    width: 100
                },
                {
                    xtype:"datecolumn",
                    format:'m/d h:i:s',
                    header: 'Finished',
                    dataIndex: 'enddate',
                    width: 100
                },
                {
                    header: 'Elapsed Time',
                    dataIndex: 'runtime',
                    width: 75,
                    renderer: function(value,meta,record){
                        if (value == "") return "";
                        var hours = Math.floor(parseInt(value,10) / 36e5),
                            mins = Math.floor((parseInt(value,10) % 36e5) / 6e4),
                            secs = Math.floor((parseInt(value,10) % 6e4) / 1000);
                        return hours+"h:"+mins+"m:"+secs+"s";
                    }
                },
                {
                    header: 'Error',
                    dataIndex: 'error',
                    width: 250,
                    renderer: function(value,meta,record){
                        if (value == "") return value;
                        //if(value.indexOf("<div style") == -1){
                            //
                        //    record.set("error",'<div style="color:red" ext:qwidth="150" ext:qtip="' + value + '">' + value + '</div>');
                        //}
                        value = Ext.util.Format.htmlEncode(value);
                        meta.tdAttr = 'data-qtip="' + value + '"';
                        return '<div style="color:red" ext:qwidth="150" ext:qtip="' + value + '">' + value + '</div>'

                    }
                },
                {
                    header: 'Result',
                    dataIndex: 'result',
                    width: 120,
                    renderer: function(value,record){
                        if (value == "Passed"){
                            return "<p style='color:green'>"+value+"</p>"
                        }
                        else if (value == "Failed"){
                            return "<p style='color:red'>"+value+"</p>"
                        }
                        else{
                            return value;
                        }
                    }
                },
                {
                    header: 'Note',
                    dataIndex: 'note',
                    width: 50,
                    renderer: function(value,metadata,record){
                        if (value == ""){
                            return value;
                        }
                        else{
                            metadata.style = 'background-image: url(images/note_pinned.png);background-position: center; background-repeat: no-repeat;';
                            //metadata.tdAttr = 'data-qalign="tl-tl?" data-qtip="' + Ext.util.Format.htmlEncode(value) + '"';
                            //metadata.tdAttr = 'data-qwidth=500 data-qtip="' + Ext.util.Format.htmlEncode(value) + '"';
                            return "";
                            //return '<div ext:qtip="' + value + '"/>';
                            //return "<img src='images/note_pinned.png'/>";
                        }
                    }
                }
            ]

        });

        me.statusListener = function(options,eOpts){
            if (options.update){
                options.update.forEach(function(r){
                    if (r.get("_id") != me.itemId) return;
                    var status = r.get("status");
                    var lastScrollPos = me.getEl().dom.children[0].scrollTop;
                    me.down("#status").setValue(status);
                    me.getEl().dom.children[0].scrollTop = lastScrollPos;
                    if (status == "Running"){
                        if (me.title.indexOf("[Running]") == -1){
                            me.up("executionsEditor").down("#runExecution").setDisabled(true);
                            me.up("executionsEditor").down("#stopExecution").setDisabled(false);
                            me.setTitle(me.title+" [Running]")
                        }
                    }
                    else{
                        me.up("executionsEditor").down("#runExecution").setDisabled(false);
                        me.up("executionsEditor").down("#stopExecution").setDisabled(true);
                        me.setTitle(me.title.replace(" [Running]",""))
                    }
                });
            }
        };
        Ext.data.StoreManager.lookup("Executions").on("beforesync",me.statusListener);

        me.chartStore =  new Ext.data.Store({
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'data',     type: 'int'}
            ],
            data: [
                { 'name': 'Passed',   'data': 0 , color:"green"},
                { 'name': 'Failed',   'data':  0, color:"red" },
                { 'name': 'Not Run', 'data':  0, color:"#ffb013" }
            ]
        });


        this.items = [
            {
                xtype: 'fieldset',
                title: 'Details',
                defaultType: 'textfield',
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
                        store:Ext.data.StoreManager.lookup('ExecutionTags'),
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
                    },
                    {
                        xtype: "combo",
                        anchor:'90%',
                        fieldLabel: 'Test Set',
                        store: Ext.data.StoreManager.lookup('TestSets'),
                        labelStyle: "font-weight: bold",
                        //value: "",
                        queryMode: 'local',
                        displayField: 'name',
                        valueField: '_id',
                        forceSelection: true,
                        editable: false,
                        allowBlank: false,
                        itemId:"testset",
                        listeners:{
                            change: function(combo,newVal,oldVal){
                                if (me.dataRecord != null) return;
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                                var testSet = combo.store.findRecord("_id",newVal);
                                me.down("#executionTestcases").store.removeAll();
                                var allTCs = []
                                testSet.get("testcases").forEach(function(testcaseId){
                                    var testcase = Ext.data.StoreManager.lookup('TestCases').query("_id",testcaseId._id).getAt(0);
                                    //me.down("#executionTestcases").store.add({name:testcase.get("name"),tag:testcase.get("tag"),status:"Not Run",testcaseID:testcase.get("_id"),_id: Ext.uniqueId()});
                                    if(testcase){
                                        allTCs.push({name:testcase.get("name"),tag:testcase.get("tag"),status:"Not Run",testcaseID:testcase.get("_id"),_id: Ext.uniqueId()});
                                    }
                                });
                                me.down("#executionTestcases").store.add(allTCs);
                                me.down("#totalNotRun").setRawValue(allTCs.length);
                                me.down("#totalTestCases").setRawValue(allTCs.length);
                            }
                        }
                    },
                    {
                        xtype:"displayfield",
                        fieldLabel: "State",
                        //labelStyle: "font-weight: bold",
                        itemId:"status",
                        anchor:'90%',
                        renderer: function(value,meta){
                            if (value == "Ready To Run"){
                                return "<p style='font-weight:bold;color:#ffb013'>"+value+"</p>";
                            }
                            else{
                                return "<p style='font-weight:bold;color:green'>"+value+"</p>";
                            }
                        }
                    },
                    {
                        xtype: 'numberfield',
                        width: 150,
                        //anchor: "90%",
                        itemId: "retryCount",
                        fieldLabel: 'Retry Count',
                        value: 0,
                        maxValue: 99,
                        minValue: 0,
                        listeners:{
                            afterrender: function(me,eOpt){
                                Ext.tip.QuickTipManager.register({
                                    target: me.getEl(),
                                    text: 'Number of times to re-run failed test cases.',
                                    dismissDelay: 10000 // Hide after 10 seconds hover
                                });
                            },
                            blur: function(me){
                                if (me.getValue() === null){
                                    me.setValue(0)
                                }
                            }
                        }
                    },
                    {
                        xtype: "checkbox",
                        fieldLabel: "Ignore Status",
                        itemId:"ignoreStatus",
                        anchor:'90%',
                        listeners:{
                            afterrender: function(me,eOpt){
                                Ext.tip.QuickTipManager.register({
                                    target: me.getEl(),
                                    //title: 'My Tooltip',
                                    text: 'Run Test Cases even if Test Case or Action status is Not Automated or Needs Maintanence.',
                                    //width: 100,
                                    dismissDelay: 10000 // Hide after 10 seconds hover
                                });
                            },
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    },
                    {
                        xtype: "checkbox",
                        fieldLabel: "No Screen Shots",
                        itemId:"ignoreScreenshots",
                        anchor:'90%',
                        listeners:{
                            afterrender: function(me,eOpt){
                                Ext.tip.QuickTipManager.register({
                                    target: me.getEl(),
                                    //title: 'My Tooltip',
                                    text: "Don't take any screen shot during the test.",
                                    //width: 100,
                                    dismissDelay: 10000 // Hide after 10 seconds hover
                                });
                            },
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    },
                    {
                        xtype: 'button',
                        cls: 'x-btn-text-icon',
                        icon: 'images/lock_open.png',
                        itemId: "locked",
                        text: 'Lock',
                        iconAlign: "right",
                        handler: function(btn) {
                            if(btn.getText() == "Lock"){
                                btn.setText("Unlock");
                                btn.setIcon("images/lock_ok.png")
                            }
                            else{
                                btn.setText("Lock");
                                btn.setIcon("images/lock_open.png")
                            }
                            if (me.loadingData === false){
                                me.markDirty();
                            }
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Set Variables',
                flex: 1,
                collapsible: true,
                items:[
                    variablesGrid
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Execution Totals',
                flex: 1,
                collapsible: true,
                layout:"hbox",
                defaults: {
                    margin: '0 10 0 5',
                    labelWidth: "80px",
                    labelStyle: "font-weight: bold"
                },
                items:[
                    {
                        xtype:"displayfield",
                        fieldLabel: "Total",
                        itemId:"totalTestCases",
                        value: "0",
                        renderer: function(value,meta){
                            return "<p style='font-weight:bold;color:blue'>"+value+"</p>";
                        }

                    },
                    {
                        xtype:"displayfield",
                        fieldLabel: "Passed",
                        itemId:"totalPassed",
                        value: "0",
                        renderer: function(value,meta){
                            if (value == "0"){
                                return value
                            }
                            else{
                                return "<p style='font-weight:bold;color:green'>"+value+"</p>";
                            }
                        }
                    },
                    {
                        xtype:"displayfield",
                        fieldLabel: "Failed",
                        itemId:"totalFailed",
                        value: "0",
                        renderer: function(value,meta){
                            if (value == "0"){
                                return value;
                            }
                            else{
                                return "<p style='font-weight:bold;color:red'>"+value+"</p>";
                            }
                        }
                    },
                    {
                        xtype:"displayfield",
                        fieldLabel: "Not Run",
                        itemId:"totalNotRun",
                        value: "0",
                        renderer: function(value,meta){
                            if (value == "0"){
                                return value;
                            }
                            else{
                                return "<p style='font-weight:bold;color:#ffb013'>"+value+"</p>";
                            }
                        }
                    },
                    {
                        xtype:"displayfield",
                        fieldLabel: "Run Time",
                        itemId:"runtime",
                        value: "0",
                        renderer: function(value,meta){
                            var hours = Math.floor(parseInt(value,10) / 36e5),
                                mins = Math.floor((parseInt(value,10) % 36e5) / 6e4),
                                secs = Math.floor((parseInt(value,10) % 6e4) / 1000);

                            return "<p style='font-weight:bold;color:#blue'>"+hours+"h:"+mins+"m:"+secs+"s"+"</p>";
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Execution Chart',
                flex: 1,
                collapsible: true,
                collapsed: true,
                layout:"fit",
                defaults: {
                    margin: '0 10 0 5',
                    labelWidth: "60px",
                    labelStyle: "font-weight: bold"
                },
                items:[
                    {
                        xtype:"chart",
                        width: 500,
                        height: 350,
                        animate: false,
                        store: me.chartStore,
                        theme: 'Base:gradients',
                        series: [{
                            type: 'pie',
                            angleField: 'data',
                            showInLegend: true,
                            renderer: function(sprite, record, attr, index, store) {
                                var color = "green";
                                if(record.get("name") == "Passed") color = "green";
                                if(record.get("name") == "Failed") color = "red";
                                if(record.get("name") == "Not Run") color = "#ffb013";
                                return Ext.apply(attr, {
                                    fill: color
                                });
                            },
                            tips: {
                                trackMouse: true,
                                width: 140,
                                height: 28,
                                renderer: function(storeItem, item,attr) {
                                    // calculate and display percentage on hover
                                    var total = 0;
                                    //me.chartStore.each(function(rec) {
                                    //    total += rec.get('data');
                                    //});
                                    //this.setTitle(storeItem.get('name') + ': ' + Math.round(storeItem.get('data') / total * 100) + '%');
                                    this.setTitle(storeItem.get('name') + ': ' + storeItem.get('data'));

                                }
                            },
                            /*
                            highlight: {
                                segment: {
                                    margin: 10
                                }
                            },
                            */
                            label: {
                                field: 'name',
                                //display: 'rotate',
                                display: 'outside',
                                //contrast: true,
                                //color:"#22EDFF",
                                font: '18px Arial'
                            }
                        }]
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Select Machines',
                flex: 1,
                collapsible: true,
                items:[
                    machinesGrid
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Test Cases',
                flex: 1,
                collapsible: true,
                items:[
                    testcasesGrid
                ]
            }
        ];

        this.callParent(arguments);
        me.loadingData = false;
    },
    listeners:{
        afterrender: function(me){
            me.loadingData = true;
            if (me.dataRecord != null){
                me.down("#name").setValue(me.dataRecord.get("name"));
                me.down("#status").setValue(me.dataRecord.get("status"));
                me.down("#tag").setValue(me.dataRecord.get("tag"));
                me.down("#testset").setValue(me.dataRecord.get("testset"));
                me.down("#testset").setDisabled(true);
                me.down("#executionTestcases").store.removeAll();
                me.down("#ignoreStatus").setValue(me.dataRecord.get("ignoreStatus"));
                me.down("#ignoreScreenshots").setValue(me.dataRecord.get("ignoreScreenshots"));
                if (me.dataRecord.get("locked") == true){
                    me.down("#locked").setIcon("images/lock_ok.png");
                    me.down("#locked").setText("Unlock");
                }
                else{
                    me.down("#locked").setIcon("images/lock_open.png");
                    me.down("#locked").setText("Lock");
                }

                var allTCs = [];
                me.dataRecord.get("testcases").forEach(function(testcase){
                    var originalTC = Ext.data.StoreManager.lookup('TestCases').query("_id",testcase.testcaseID).getAt(0);
                    if (originalTC){
                        testcase.name = originalTC.get("name");
                        testcase.tag = originalTC.get("tag");
                        allTCs.push(testcase);
                    }
                });
                me.down("#executionTestcases").store.add(allTCs);
            }
            me.loadingData = false;
            me.initialTotals();
            this.down("#name").focus();

            me.on("beforecontainermousedown",function(){
                //if (me.getEl()){
                //me.lastScrollPos = me.getEl().dom.children[0].scrollTop;
                //console.log(me.lastScrollPos)
                //}
            });

            me.down("#executionTestcases").getSelectionModel().on("selectionchange",function(){
                //if(me.lastScrollPos != null){
                //    me.getEl().dom.children[0].scrollTop =  me.lastScrollPos;
                //    me.lastScrollPos = null;
                //}
            })
        },

        beforedestroy: function(me){
            Ext.data.StoreManager.lookup("Executions").removeListener("beforesync",me.statusListener);
            Ext.data.StoreManager.lookup("Machines").removeListener("beforesync",me.machinesListener);
            Ext.data.StoreManager.lookup("Variables").removeListener("beforesync",me.variablesListener);
        }
    },

    validate: function(store){
        if (this.down("#name").validate() == false){
            this.down("#name").focus();
            return false;
        }
        if (this.down("#testset").validate() == false){
            this.down("#testset").focus();
            return false;
        }
        return true;
    },

    getStatus: function(){
        return this.down("#status").getValue();
    },

    getSelectedTestCases: function(){
        var testcases = [];
        this.down("#executionTestcases").getSelectionModel().getSelection().forEach(function(testcase){
            testcases.push({testcaseID:testcase.get("testcaseID"),_id:testcase.get("_id"),resultID:testcase.get("resultID"),startAction:testcase.get("startAction"),endAction:testcase.get("endAction")});
        });

        return testcases;
    },

    getSelectedMachines: function(){
        var machines = [];

        this.down("#executionMachines").getSelectionModel().getSelection().forEach(function(machine){
            machines.push(machine.data);
        });

        return machines;
    },
    getExecutionData: function(){
        var execution = {};
        execution._id = this.itemId;
        execution.name = this.down("#name").getValue();
        execution.tag = this.down("#tag").getValue();
        execution.testset = this.down("#testset").getValue();
        execution.testsetname = this.down("#testset").getRawValue ();
        execution.ignoreStatus = this.down("#ignoreStatus").getValue();
        execution.ignoreScreenshots = this.down("#ignoreScreenshots").getValue();

        if (this.down("#locked").getText() == "Lock"){
            execution.locked = false;
        }
        else{
            execution.locked = true;
        }

        var variablesStore = this.down("#executionVars").store;
        execution.variables = [];
        variablesStore.each(function(item){
            execution.variables.push(item.data);
        });

        var testcasesStore = this.down("#executionTestcases").store;
        execution.testcases = [];
        testcasesStore.each(function(item){
            execution.testcases.push(item.data);
        });

        var machinesStore = this.down("#executionMachines").store;
        execution.machines = [];
        machinesStore.each(function(item){
            execution.machines.push(item.data);
        });
        return execution;
    }

});