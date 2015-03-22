function openResultDetails(id,executionID){
    var controller = Redwood.app.getController("Executions");
    controller.openExecutionDetails(id,executionID);

    if(Ext.isChrome){
        return false;
    }
}

function openScreenShot(id){
    var controller = Redwood.app.getController("Executions");
    controller.openScreenShot(id);

    if(Ext.isChrome){
        return false;
    }
}

function openExecution(id){
    var controller = Redwood.app.getController("Executions");
    controller.onExecutionEdit(id);

    if(Ext.isChrome){
        return false;
    }
}

function openDetailedTrace(id){
    var controller = Redwood.app.getController("Executions");
    var trace = controller.tabPanel.getActiveTab().resultsStore.getNodeById(id).get("trace");
    Ext.create('Ext.window.Window', {
        title: 'Full Trace',
        modal: true,
        height: 400,
        width: 700,
        overflowY:'auto',
        layout: 'fit',
        items: {
            xtype:"panel",
            overflowY:'auto',
            layout: 'fit',
            items:{
                xtype: 'text',
                html: trace,
                overflowY:'auto'
            }
        }
    }).show();
    if(Ext.isChrome){
        return false;
    }
}


Ext.define("Redwood.controller.Executions", {
    extend: 'Ext.app.Controller',

    models: ['Executions','ExecutionTags'],
    stores: ['Executions','ExecutionTags'],
    views:  ['Executions','ResultsView','ActionPicker','TestCaseNote','AggregateReport'],

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
                run: this.runExecution,
                stop: this.stopExecution,
                aggregate: this.aggregateReport
            }

        });
    },
    openingExecutions: {},
    openingExecutionDetails: {},

    aggregateReport: function(executionsToAggregate){
        var executions = [];
        var me = this;

        if(executionsToAggregate == undefined){
            var executionView = this.tabPanel.getActiveTab();
            if ((executionView === undefined)||(executionView.viewType != "All Executions")){
                //return;
            }

            executionView.getSelectionModel().getSelection().forEach(function(execution){
                executions.push({_id:execution.get("_id"),name:execution.get("name"),tag:execution.get("tag"),lastRunDate:execution.get("lastRunDate")});
            });
            if(executions.length == 0){
                Ext.Msg.alert('Error', "No executions are selected.");
                return;
            }
        }
        else{
            executionsToAggregate.forEach(function(id){
                executions.push({_id:id});
            });
        }

        Ext.Ajax.request({
            url:"/aggregate",
            method:"POST",
            jsonData : executions,
            disableCaching:true,
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.error != null){
                    Ext.Msg.alert('Error', obj.error);
                }
                else{
                    var tab = Ext.create('Redwood.view.AggregateReport',{
                        title:"[Aggregate Report]",
                        closable:true,
                        dataRecord:obj
                    });

                    me.tabPanel.add(tab);
                    me.tabPanel.setActiveTab(tab);
                }
            }
        });

    },

    stopExecution: function(){
        var executionView = this.tabPanel.getActiveTab();
        if ((executionView === undefined)||(executionView.viewType != "Execution")){
            return;
        }
        Ext.MessageBox.show({
            msg: 'Stopping Execution',
            progressText: 'Stopping...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
        });
        var executionID = executionView.dataRecord.get("_id");
        if (!executionID) return;
        Ext.Ajax.request({
            url:"/executionengine/stopexecution",
            method:"POST",
            jsonData : {executionID:executionID},
            success: function(response) {
                executionView.up("executionsEditor").down("#runExecution").setDisabled(false);
                if (Ext.MessageBox.isVisible()) Ext.MessageBox.hide();
            }
        });
    },

    openExecutionDetails: function(id,executionID){
        var me = this;
        if(me.openingExecutionDetails[id] == true) return;
        me.openingExecutionDetails[id] = true;
        Ext.Ajax.request({
            url:"/results/"+id,
            method:"GET",
            disableCaching:true,
            timeout: 60000,
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.error != null){
                    Ext.Msg.alert('Error', obj.error);
                    delete me.openingExecutionDetails[id];
                }
                else if(obj.testcase){
                    var foundTab = me.tabPanel.down("#"+id);
                    if (foundTab != null){
                        me.tabPanel.setActiveTab(foundTab);
                        delete me.openingExecutionDetails[id];
                        return;
                    }
                    var tab = Ext.create('Redwood.view.ResultsView',{
                        title:"[Test Details] " + obj.testcase.name,
                        closable:true,
                        dataRecord:obj,
                        executionID:executionID,
                        itemId:id
                    });

                    me.tabPanel.add(tab);
                    me.tabPanel.setActiveTab(tab);
                    delete me.openingExecutionDetails[id];
                }
            },
            failure: function(){
                Ext.Msg.alert('Error', "Unable to get result details.  Communication failed.");
                delete me.openingExecutionDetails[id];
            }
        });
    },

    openScreenShot: function(id){
        window.open(location.protocol + "//" + location.host +"/screenshots/"+id);
    },

    runExecution: function(){
        var me = this;
        var executionView = this.tabPanel.getActiveTab();
        if ((executionView === undefined)||(executionView.viewType != "Execution")){
            return;
        }

        var machines = executionView.getSelectedMachines();
        var templates = executionView.getSelectedTemplates();
        var testcases = executionView.getSelectedTestCases();
        var ignoreStatus = executionView.down("#ignoreStatus").getValue();
        var ignoreAfterState = executionView.down("#ignoreAfterState").getValue();
        var ignoreScreenshots = executionView.down("#ignoreScreenshots").getValue();
        var allScreenshots = executionView.down("#allScreenshots").getValue();
        var retryCount = executionView.down("#retryCount").getValue();
        var sendEmail = executionView.down("#sendEmail").getValue();
        var status = executionView.getStatus();
        var locked =  false;
        if (executionView.down("#locked").getText() == "Unlock") locked = true;

        if (status == "Running") {
            Ext.Msg.alert('Error', "Execution is currently running");
            return;
        }

        if (locked == true) {
            Ext.Msg.alert('Error', "Unable to run locked executions");
            return;
        }

        if (machines.length == 0 && templates.length == 0){
            Ext.Msg.alert('Error', "Please select phisical or cloud machines to run the execution on.");
            return;
        }
        if (testcases.length == 0){
            Ext.Msg.alert('Error', "Please select test cases to run the execution against.");
            return;
        }

        /*
        var machinesRunning = false;
        machines.forEach(function(machine){
            if(machine.state == "Running") machinesRunning = true;
        });

        if (machinesRunning == true){
            Ext.Msg.alert('Error', "Please select machines to run the execution on.");
            return;
        }
        */
        Ext.MessageBox.show({
            msg: 'Starting Execution',
            progressText: 'Starting...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
        });

        //close any open results
        //add retry count as well
        testcases.forEach(function(testcase){
            testcase.retryCount = parseInt(retryCount);
            if(testcase.resultID){
                var tab = me.tabPanel.down("#"+testcase.resultID);
                if (tab){
                    tab.close();
                }
            }
        });
        executionView.up("executionsEditor").down("#runExecution").setDisabled(true);
        executionView.up("executionsEditor").down("#stopExecution").setDisabled(false);
        executionView.down("#executionTestcases").getSelectionModel().deselectAll();
        //executionView.down("#executionMachines").getSelectionModel().deselectAll();

        this.saveExecution(function(execution){
            Ext.Ajax.request({
                timeout: 120000,
                url:"/executionengine/startexecution",
                method:"POST",
                jsonData : {sendEmail:sendEmail,ignoreAfterState:ignoreAfterState,ignoreStatus:ignoreStatus,ignoreScreenshots:ignoreScreenshots,allScreenshots:allScreenshots,testcases:testcases,variables:execution.get("variables"),executionID:execution.get("_id"),machines:machines,templates:templates},
                success: function(response) {
                    if (Ext.MessageBox.isVisible()) Ext.MessageBox.hide();
                    var obj = Ext.decode(response.responseText);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', Ext.util.Format.htmlEncode(obj.error));
                        executionView.up("executionsEditor").down("#runExecution").setDisabled(false);
                        executionView.up("executionsEditor").down("#stopExecution").setDisabled(true);
                    }
                }
            });
        })
    },

    saveExecution: function(callback){
        var executionView = this.tabPanel.getActiveTab();

        if (executionView.dirty == false) {
            if(callback) callback(executionView.dataRecord);
            return;
        }
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
            var id = execution._id;
            delete execution._id;
            execution.status = "Ready To Run";
            executionView.dataRecord = this.getStore('Executions').add(execution)[0];
            executionView.dataRecord.set("_id",id);
            executionView.dataRecord.phantom = true;
            window.history.replaceState("", "", '/index.html?execution='+id+"&project="+Ext.util.Cookies.get('project'));
        }
        else{
            executionView.dataRecord.set("name",execution.name);
            executionView.dataRecord.set("variables",execution.variables);
            executionView.dataRecord.set("machines",execution.machines);
            executionView.dataRecord.set("emails",execution.emails);
            executionView.dataRecord.set("locked",execution.locked);
            executionView.dataRecord.set("tag",execution.tag);
            executionView.dataRecord.dirty = true;
        }

        executionView.dataRecord.set("ignoreStatus",execution.ignoreStatus);
        executionView.dataRecord.set("ignoreScreenshots",execution.ignoreScreenshots);
        executionView.dataRecord.set("allScreenshots",execution.allScreenshots);
        executionView.dataRecord.set("ignoreAfterState",execution.ignoreAfterState);


        this.getStore('Executions').sync({success:function(){
            if (newExecution == false){
                if (typeof (callback) === 'function') callback(executionView.dataRecord);
            }
            /*
            if ((newExecution == false) &&(executionView.noteChanged == true)){
                execution.testcases.forEach(function(testcase){
                    testcase.executionID = executionView.dataRecord.get("_id");
                });

                Ext.Ajax.request({
                    url:"/executiontestcases",
                    method:"PUT",
                    jsonData : execution.testcases,
                    success: function(response) {
                        //if(obj.error != null){
                        //    Ext.Msg.alert('Error', obj.error);
                        //}
                    }
                });
            }
            else  */
            if (newExecution == true){
                execution.testcases.forEach(function(testcase){
                    testcase.executionID = executionView.dataRecord.get("_id");
                });
                Ext.Ajax.request({
                    url:"/executiontestcases",
                    method:"POST",
                    jsonData : execution.testcases,
                    success: function(response) {
                        var obj = Ext.decode(response.responseText);
                        if (typeof (callback) === 'function') callback(executionView.dataRecord);
                        if(obj.error != null){
                            Ext.Msg.alert('Error', obj.error);
                        }
                    }
                });
            }

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
    onExecutionEdit: function(id){
        var me = this;
        if(me.openingExecutions[id] == true) return;
        me.openingExecutions[id] = true;
        var record = Ext.data.StoreManager.lookup('Executions').query("_id",id).getAt(0);
        if((id) &&(record)) {
            //var foundIndex = this.tabPanel.items.findIndex("title","[Execution] "+record.get("name"),0,false,true);
            var foundTab = me.tabPanel.down("#"+record.get("_id"));
            if (foundTab === null){
                Ext.Ajax.request({
                    timeout: 60000,
                    url:"/executiontestcases/"+record.get("_id"),
                    method:"GET",
                    //jsonData : {executionID:record.get("_id")},
                    success: function(response, action) {
                        var obj = Ext.decode(response.responseText);
                        if(obj.error != null){
                            Ext.Msg.alert('Error', obj.error);
                            delete me.openingExecutions[id];
                            return;
                        }
                        record.set("testcases",obj.executiontestcases);
                        var status = "";
                        if(record.get("status") == "Running"){
                            status = " [Running]"
                        }
                        var tab = Ext.create('Redwood.view.ExecutionView',{
                            title:"[Execution] " + record.get("name")+status,
                            closable:true,
                            dataRecord:record,
                            itemId:record.get("_id")
                        });

                        me.tabPanel.add(tab);
                        //foundIndex = me.tabPanel.items.findIndex("title","[Execution] "+record.get("name"),0,false,true);
                        foundTab = me.tabPanel.down("#"+record.get("_id"));
                        me.tabPanel.setActiveTab(foundTab);
                        delete me.openingExecutions[id];
                    },
                    failure: function(){
                        Ext.Msg.alert('Error', "Unable to get execution.  Communication failed.");
                        delete me.openingExecutions[id];
                    }
                });

            }
            else{
                me.tabPanel.setActiveTab(foundTab);
                delete me.openingExecutions[id];
            }
        }
        else{
            delete me.openingExecutions[id];
        }
    },

    onExecutionDelete: function(record){
        var foundTab = this.tabPanel.down("#"+record.get("_id"));
        if(record) {
            if (record.get("status") == "Running"){
                Ext.Msg.alert('Error', "Unable to delete running execution.");
                return;
            }
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("name") + "' execution?" ,
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id === "yes"){
                        if (foundTab){
                            foundTab.dirty = false;
                            foundTab.close();
                        }
                        Ext.data.StoreManager.lookup('Executions').remove(record);
                        Ext.data.StoreManager.lookup('Executions').sync({success:function(batch,options){} });
                    }
                }
            });
        }

    },

    afterExecutionEdit: function(evtData){
        var varStore = this.getStore('Executions');
        this.getStore('ExecutionTags').sync();
        varStore.sync({success:function(batch,options){} });
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
        var me = this;
        Ext.data.StoreManager.lookup('Executions').each(function(execution){
            var record = Ext.data.StoreManager.lookup('TestSets').findRecord("_id", execution.get("testset"));
            if (record == null){
                Ext.data.StoreManager.lookup('TestSets').on("load",function(){
                    me.getTetSetNames();
                });
            }
            else{
                var setName = record.get("name");
                execution.set("testsetname",setName);
            }
        });
    },

    onEditorRender: function () {
        var me = this;

        this.executionsEditor = Ext.ComponentQuery.query('executionsEditor')[0];
        this.grid = this.executionsEditor;
        this.tabPanel = Ext.ComponentQuery.query('#executionsTab',this.executionsEditor)[0];
        //this.getTetSetNames();

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
        this.executionsEditor.down("#runExecution").hide();
        this.executionsEditor.down("#stopExecution").hide();
        this.executionsEditor.down("#saveExecution").hide();
        this.tabPanel.on("tabchange",function(panel,tab){
            if (tab.title.indexOf("Execution]") != -1){
                tab.up("executionsEditor").down("#runExecution").show();
                tab.up("executionsEditor").down("#stopExecution").show();
                tab.up("executionsEditor").down("#saveExecution").show();
                //tab.up("executionsEditor").down("#searchExecution").hide();
                //tab.up("executionsEditor").down("#aggregationReport").hide();
                if (tab.getStatus() === "Running"){
                    tab.up("executionsEditor").down("#runExecution").setDisabled(true);
                    tab.up("executionsEditor").down("#stopExecution").setDisabled(false);
                }
                else{
                    tab.up("executionsEditor").down("#runExecution").setDisabled(false);
                    tab.up("executionsEditor").down("#stopExecution").setDisabled(true);
                }
            }
            else if(tab.title.indexOf("Test Details]") != -1){
                tab.up("executionsEditor").down("#runExecution").hide();
                tab.up("executionsEditor").down("#stopExecution").hide();
                tab.up("executionsEditor").down("#saveExecution").hide();
                //tab.up("executionsEditor").down("#searchExecution").hide();
                //tab.up("executionsEditor").down("#aggregationReport").hide();
                tab.refreshHeight();
            }
            else if(tab.title.indexOf("Aggregate Report]") != -1){
                tab.up("executionsEditor").down("#runExecution").hide();
                tab.up("executionsEditor").down("#stopExecution").hide();
                tab.up("executionsEditor").down("#saveExecution").hide();
                //tab.up("executionsEditor").down("#searchExecution").hide();
                //tab.up("executionsEditor").down("#aggregationReport").hide();
            }
            else{
                tab.up("executionsEditor").down("#runExecution").hide();
                tab.up("executionsEditor").down("#stopExecution").hide();
                tab.up("executionsEditor").down("#saveExecution").hide();
                //tab.up("executionsEditor").down("#searchExecution").show();
                //tab.up("executionsEditor").down("#aggregationReport").show();
            }
        })
    }
});