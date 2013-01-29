Ext.define("Redwood.controller.Executions", {
    extend: 'Ext.app.Controller',

    models: ['Executions','ExecutionTags'],
    stores: ['Executions','ExecutionTags'],
    views:  ['Executions'],

    init: function () {
        this.control({
            'executionsEditor': {
                render: this.onEditorRender,
                edit: this.afterExecutionEdit,
                executionEdit: this.onExecutionEdit,
                executionDelete: this.onExecutionDelete,
                celldblclick: this.onDoubleClick,
                newExecution: this.addExecution,
                save: this.saveExecution,
                run: this.runExecution
            }

        });
    },

    runExecution: function(){
        var executionView = this.tabPanel.getActiveTab();
        if ((executionView === undefined)||(executionView.viewType != "Execution")){
            return;
        }
        var machines = executionView.getSelectedMachines();
        var testcases = executionView.getSelectedTestCases();
        if (machines.length == 0){
            Ext.Msg.alert('Error', "Please select machines to run the execution on.");
            return;
        }
        if (testcases.length == 0){
            Ext.Msg.alert('Error', "Please select test cases to run the execution against.");
            return;
        }

        this.saveExecution(function(execution){
            Ext.Ajax.request({
                url:"/executionengine/startexecution",
                method:"POST",
                jsonData : {testcases:testcases,variables:execution.get("variables"),executionID:execution.get("_id"),machines:machines},
                success: function(response) {
                    var obj = Ext.decode(response.responseText);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', obj.error);
                    }
                }
            });
        })
    },

    saveExecution: function(callback){
        var executionView = this.tabPanel.getActiveTab();
        if ((executionView === undefined)||(executionView.viewType != "Execution")){
            return;
        }
        if (executionView.validate(this.getStore('Executions')) === false){
            return;
        }
        var execution = executionView.getExecutionData();
        var newExecution = false;
        if (executionView.dataRecord === null){
            newExecution = true;
            executionView.dataRecord = this.getStore('Executions').add(execution)[0];
        }
        else{
            executionView.dataRecord.set("name",execution.name);
            executionView.dataRecord.set("tag",execution.tag);
        }
        this.getStore('Executions').sync({success:function(){
            if (newExecution == false){
                callback(executionView.dataRecord);
                return;
            }

            execution.testcases.forEach(function(testcase){
                testcase.executionID = executionView.dataRecord.get("_id");
            });
            Ext.Ajax.request({
                url:"/executiontestcases",
                method:"POST",
                jsonData : execution.testcases,
                success: function(response) {
                    var obj = Ext.decode(response.responseText);
                    callback(executionView.dataRecord);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', obj.error);
                    }
                }
            });
        }});
        this.getStore('ExecutionTags').sync();


        executionView.setTitle("[Execution] "+execution.name);
        executionView.down("#testset").setDisabled(true);
        executionView.dirty = false;

    },
    onDoubleClick: function(me,td,cell,record,tr){
        if(record) {
            var executionEditWindow = new Redwood.view.ExecutionEdit({newExecution:false,testSetData:record});
            executionEditWindow.show();
        }
    },
    onExecutionEdit: function(record){
        var me = this;
        if(record) {
            var foundIndex = this.tabPanel.items.findIndex("title","[Execution] "+record.get("name"),0,false,true);
            if (foundIndex == -1){
                Ext.Ajax.request({
                    url:"/executiontestcases/"+record.get("_id"),
                    method:"GET",
                    //jsonData : {executionID:record.get("_id")},
                    success: function(response, action) {
                        var obj = Ext.decode(response.responseText);
                        if(obj.error != null){
                            Ext.Msg.alert('Error', obj.error);
                        }
                        record.set("testcases",obj.executiontestcases);
                        var tab = Ext.create('Redwood.view.ExecutionView',{
                            title:"[Execution] " + record.get("name"),
                            closable:true,
                            dataRecord:record,
                            itemId:record.get("name")
                        });

                        me.tabPanel.add(tab);
                        foundIndex = me.tabPanel.items.findIndex("title","[Execution] "+record.get("name"),0,false,true);
                        me.tabPanel.setActiveTab(foundIndex);
                    }
                });

            }
            else{
                this.tabPanel.setActiveTab(foundIndex);
            }
        }
    },

    onExecutionDelete: function(record){
        if(record) {
            Ext.data.StoreManager.lookup('Executions').remove(record);
            Ext.data.StoreManager.lookup('Executions').sync({success:function(batch,options){Ext.data.StoreManager.lookup('Executions').load();} });
        }

    },

    afterExecutionEdit: function(evtData){
        var varStore = this.getStore('Executions');
        this.getStore('ExecutionTags').sync();
        varStore.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Executions').load();} });
    },

    addExecution: function () {
        var tab = Ext.create('Redwood.view.ExecutionView',{
            title:"[New Execution]",
            closable:true
        });

        this.tabPanel.add(tab);
        this.tabPanel.setActiveTab(tab);
        tab.down("#name").focus();
    },

    getTetSetNames: function(){
        Ext.data.StoreManager.lookup('Executions').each(function(execution){
            var setName = Ext.data.StoreManager.lookup('TestSets').findRecord("_id", execution.get("testset")).get("name");
            execution.set("testsetname",setName);
        });
    },

    onEditorRender: function () {
        var me = this;
        this.executionsEditor = Ext.ComponentQuery.query('executionsEditor')[0];
        this.grid = this.executionsEditor;
        this.tabPanel = Ext.ComponentQuery.query('#executionsTab',this.executionsEditor)[0];
        this.getTetSetNames();
        Ext.data.StoreManager.lookup('Executions').on("load",function(){
            me.getTetSetNames();
        });
        Ext.data.StoreManager.lookup('Executions').on("beforesync",function(options){
            if (options.create){
                me.getTetSetNames();
            }
        });
        Ext.data.StoreManager.lookup('TestSets').on("beforesync", function(options,eOpts){
            if (options.update){
                me.getTetSetNames();
            }
        });
    }
});