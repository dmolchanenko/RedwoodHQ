
Ext.define('Redwood.view.ExecutionView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.executionview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    dirty: false,
    loadingData: true,
    viewType: "Execution",

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
                            var editor = me.up('actions');
                            editor.fireEvent('saveExectuion');
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

        variablesStore.on("beforesync", function(options,eOpts){
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
                    if (variable.get("taskVar") == true){
                        var linkedRecord = linkedVarStore.findRecord("_id", variable.get("_id"));
                        linkedRecord.set("name", variable.get("name"));
                        linkedRecord.set("tag", variable.get("tag"));
                        linkedRecord.set("possibleValues", variable.get("possibleValues"));
                    }
                });
            }
        });

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
            var foundMachine = false;
            if ((me.dataRecord != null)&&(me.dataRecord.get("machines"))){
                me.dataRecord.get("machines").forEach(function(recordedMachine){
                    if(recordedMachine._id === machine.get("_id")){
                        foundMachine = recordedMachine.selected;
                    }
                })
            }
            machines.push({host:machine.get("host"),tag:machine.get("tag"),description:machine.get("description"),roles:machine.get("roles"),_id:machine.get("_id"),selected:foundMachine})
        });

        var linkedMachineStore =  new Ext.data.Store({
            fields: [
                {name: 'host',     type: 'string'},
                {name: 'tag',     type: 'array'},
                {name: 'description',     type: 'string'},
                {name: 'roles',     type: 'array'},
                {name: '_id',     type: 'string'}
            ],
            data: machines,
            listeners:{
                datachanged:function(){
                    if (me.loadingData === false){
                        me.markDirty("machineStore");
                    }
                }
            }
        });

        machinesStore.on("beforesync", function(options,eOpts){
            if (options.create){
                options.create.forEach(function(r){
                    linkedMachineStore.add(r);
                });
            }
            if (options.destroy){
                options.destroy.forEach(function(r){
                    linkedMachineStore.remove(linkedMachineStore.findRecord("_id", r.get("_id")));
                });
            }
            if (options.update){
                options.update.forEach(function(r){
                    var linkedRecord = linkedMachineStore.findRecord("_id", r.get("_id"));
                    linkedRecord.set("host", r.get("host"));
                    linkedRecord.set("tag", r.get("tag"));
                    linkedRecord.set("description", r.get("description"));
                    linkedRecord.set("roles", r.get("roles"));
                });
            }
        });

        var machinesGrid = new Ext.grid.Panel({
            store: linkedMachineStore,
            itemId:"executionMachines",
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
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                singleSelect: false,
                sortable: true,
                //checkOnly: true,
                stateful: true,
                showHeaderCheckbox: true
            }),
            columns:[
                {
                    header: 'Host Name/IP',
                    dataIndex: 'host',
                    width: 200
                },
                {
                    header: 'Roles',
                    dataIndex: 'roles',
                    width: 200
                },
                {
                    header: 'Description',
                    dataIndex: 'description',
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


        var executionTCStore =  new Ext.data.Store({
            storeId: "ExecutionTCs"+this.itemId,
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'tag',     type: 'array'},
                {name: 'status',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'startdate',     type: 'date'},
                {name: 'enddate',     type: 'date'},
                {name: 'runtime',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: '_id',     type: 'string'},
                {name: 'testcaseID',     type: 'string'}
            ],
            data: []
        });

        var testcasesGrid = new Ext.grid.Panel({
            store: executionTCStore,
            itemId:"executionTestcases",
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false,
                getRowClass: function(record, index) {
                    //return "x-redwood-action-row";
                    //return "x-redwood-testcase-passed";
                },
                listeners:{
                    beforecellmousedown: function(){
                        //return false;
                    }
                }
            },
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                singleSelect: false,
                sortable: true,
                //checkOnly: true,
                stateful: true,
                showHeaderCheckbox: true
            }),
            minHeight: 150,
            manageHeight: true,
            flex: 1,
            columns:[
                {
                    header: 'Name',
                    dataIndex: 'name',
                    flex: 1
                },
                {
                    header: 'Tags',
                    dataIndex: 'tag',
                    width: 200
                },
                {
                    header: 'Status',
                    dataIndex: 'status',
                    width: 100
                },
                {
                    header: 'Started',
                    dataIndex: 'startdate',
                    width: 100
                },
                {
                    header: 'Finished',
                    dataIndex: 'enddate',
                    width: 100
                },
                {
                    header: 'Time Run',
                    dataIndex: 'runtime',
                    width: 75
                },
                {
                    header: 'Error',
                    dataIndex: 'error',
                    width: 250
                },
                {
                    header: 'Result',
                    dataIndex: 'result',
                    width: 75
                }
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
                                    me.markDirty("name");
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
                        maskRe: /[a-z_0-9]/,
                        removeOnDblClick:true,
                        itemId:"tag",
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty("tags");
                                }
                            }
                        }
                    },
                    {
                        xtype: "combo",
                        anchor:'90%',
                        fieldLabel: 'Test Set',
                        store: Ext.data.StoreManager.lookup('TestSets'),
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
                                    me.markDirty("testset");
                                }
                                var testSet = combo.store.findRecord("_id",newVal);
                                me.down("#executionTestcases").store.removeAll();
                                testSet.get("testcases").forEach(function(testcaseId){
                                    var testcase = Ext.data.StoreManager.lookup('TestCases').findRecord("_id",testcaseId._id);
                                    me.down("#executionTestcases").store.add({name:testcase.get("name"),tag:testcase.get("tag"),status:"Not Run",testcaseID:testcase.get("_id"),_id: Ext.uniqueId()});
                                });

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
                me.down("#tag").setValue(me.dataRecord.get("tag"));
                me.down("#testset").setValue(me.dataRecord.get("testset"));
                me.down("#testset").setDisabled(true);
                me.down("#executionTestcases").store.removeAll();
                me.dataRecord.get("testcases").forEach(function(testcase){
                    var originalTC = Ext.data.StoreManager.lookup('TestCases').findRecord("_id",testcase.testcaseID);
                    testcase.name = originalTC.get("name");
                    testcase.tag = originalTC.get("tag");
                    me.down("#executionTestcases").store.add(testcase);
                });
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
        if (this.down("#testset").validate() == false){
            this.down("#testset").focus();
            return false;
        }
        return true;
    },

    getSelectedTestCases: function(){
        var testcases = [];
        this.down("#executionTestcases").getSelectionModel().getSelection().forEach(function(testcase){
            testcases.push({testcaseID:testcase.get("testcaseID"),_id:testcase.get("_id")});
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
        return execution;
    }

});