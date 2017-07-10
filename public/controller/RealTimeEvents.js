Ext.define("Redwood.controller.RealTimeEvents", {
    extend: 'Ext.app.Controller',

    init: function () {

        //Ext.ComponentQuery.query('variablesEditor')[0];
        //Ext.socket.emit('terminal', "newTerminalSession");
    },

    startEvents: function(){
        var me = this;
        Ext.socket.on('ImageRecorded'+Ext.util.Cookies.get('username'),function(image){
            var controller = Redwood.app.getController("Scripts");
            controller.onImageRecorded(image._id);
        });

        Ext.socket.on('TCImportDone'+Ext.util.Cookies.get('username'),function(totalCount){
            Ext.MessageBox.hide();
            Ext.Msg.show({title: "Test Cases Imported",msg:"Imported "+totalCount+" test cases.",buttons : Ext.MessageBox.OK});
        });

        Ext.socket.on('PythonRequirementRun'+Ext.util.Cookies.get('username'),function(output){
            var outputPanel = Ext.getCmp('scriptOutputPanel').down("#compileOutput").getEl();
            if (output.message){
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:output.message});
            }
            else if(output.error){
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:'<span style="color: red; ">Error: '+Ext.util.Format.htmlEncode(output.error)+'</span>'});
            }
            else if(output.freezeData){
                var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
                Ext.each(allScripts, function(script, index) {
                    var pipReqFilePath = "/"+Ext.util.Cookies.get("username")+"/PipRequirements";
                    if(script.path.indexOf(pipReqFilePath) == script.path.length -pipReqFilePath.length){
                        script.setValue(output.freezeData);
                        script.clearDirty();
                        script.refreshNeeded = true;
                    }
                });
            }
            else{
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:output.status});
            }
        });

        Ext.socket.on('UnitTestRun'+Ext.util.Cookies.get('username'),function(output){
            var outputPanel = Ext.getCmp('scriptOutputPanel').down("#compileOutput").getEl();
            if (output.message){
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:output.message});
            }
            else if(output.error){
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:'<span style="color: red; ">Error: '+Ext.util.Format.htmlEncode(output.error)+'</span>'});
            }
            else{
                Ext.DomHelper.append(outputPanel, {tag: 'div',html:output.status});
            }
        });

        Ext.socket.on('UnitTestStop'+Ext.util.Cookies.get('username'),function(output){
            Ext.getCmp('runUnitTest').setIcon('images/play.png');
            if(output.error){
                Ext.Msg.show({title: "Error",msg:output.error,buttons : Ext.MessageBox.OK});
            }
        });

        Ext.socket.on('GetAllTestCases'+Ext.util.Cookies.get('username'),function(data){
            Ext.MessageBox.hide();
            var win = null;
            if(data.testcases.length === 0 && data.import === true){
                Ext.Msg.show({title: "No Tests Found",msg:"No unit tests are found or all have been imported already.",buttons : Ext.MessageBox.OK});
            }
            else if(data.import === true){
                win = Ext.create('Redwood.view.UnitTests',{
                    title:"Select Test Cases to Import",
                    importFlag:data.import,
                    dataRecord: data.testcases
                });
                win.show();
            }
            else{
                win = Ext.create('Redwood.view.UnitTests',{
                    title:"Select Test Case to Run",
                    importFlag:data.import,
                    dataRecord: data.testcases
                });
                win.show();
            }
        });

        Ext.socket.on('FilesUploaded'+Ext.util.Cookies.get('username'),function(){
            var controller = Redwood.app.getController("Scripts");
            var expandedNodes = controller.getExpandedNodes(controller.treePanel.getRootNode());
            controller.getStore('Scripts').reload({callback:function(){
                    controller.expandNodes(expandedNodes);
            }});
            Ext.MessageBox.hide();

            Ext.Msg.alert('Success', "Files have been uploaded.");
        });

        Ext.socket.on('CollaborateScript'+Ext.util.Cookies.get('username'),function(msg){
            //console.log(msg);
            var controller = Redwood.app.getController("Collaboration");
            if(msg.operation === "requestPermission"){
                controller.requestCollab(msg.username,msg.name);
            }
            else if(msg.operation === "requestDenied"){
                controller.requestDenied();
            }
            else if(msg.operation === "requestApproved"){
                controller.requestApproved(msg.username);
            }
            else if(msg.operation === "startSession"){
                controller.startSession(msg.username,msg.text,msg.scriptName,msg.editorType);
            }
            else if(msg.operation === "change"){
                controller.performChange(msg.change);
            }
            else if(msg.operation === "selectionChange"){
                controller.performSelectionChange(msg.change);
            }
            else if(msg.operation === "cursorChange"){
                controller.performCursorChange(msg.change);
            }
        });

        Ext.socket.on('StepsRecorded'+Ext.util.Cookies.get('username'),function(recording){
            var controller = Redwood.app.getController("TestCases");
            var foundTab = controller.tabPanel.getActiveTab();
            if (foundTab){
                Ext.clipboard = {type:"action",data:recording};
                foundTab.down("actioncollection").pasteFromClipboard();
            }
        });

        Ext.socket.on('deleteProject',function(project){
            if (project.name == Ext.util.Cookies.get("project")){
                Ext.util.Cookies.clear("project");
                Ext.util.Cookies.clear("sessionid");
                window.location.reload(true);
            }
            else{
                me.removeFromStore(Ext.data.StoreManager.lookup('Projects'),project);
            }
        });

        Ext.socket.on('Login',function(username){
            if (username === Ext.util.Cookies.get('username')){
                Ext.util.Cookies.clear("sessionid");
                Ext.socket.disconnect();
                Ext.Msg.show({
                    title:'Invalid Session',
                    msg: 'This user was logged on somewhere else, this session is invalid.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR,
                    fn: function(id){
                        window.location.reload(true);
                    }
                })
            }
        });


        Ext.socket.on('newProject',function(project){
            me.addToStore(Ext.data.StoreManager.lookup('Projects'),project);
        });

        var UpdateResultCache = {};
        Ext.socket.on('UpdateResultDONE',function(result){
            var updateResult = function(result){
                var controller = Redwood.app.getController("Executions");
                var foundTab = controller.tabPanel.down("#"+result._id);
                if (foundTab){
                    foundTab.refreshResult(result);
                }
            };

            if(!UpdateResultCache[result._id]){
                UpdateResultCache[result._id] = result;
                setTimeout(function(){
                    updateResult(UpdateResultCache[result._id]);
                    delete UpdateResultCache[result._id];
                },3000)
            }
            else{
                UpdateResultCache[result._id] = result;
            }

        });

        var UpdateMachinesCache = {};
        Ext.socket.on('UpdateMachines',function(machine){
            var updateMachine = function(machine){
                var store = Ext.data.StoreManager.lookup("Machines");
                me.updateStore(store,machine);
            };

            if(!UpdateMachinesCache[machine._id]){
                UpdateMachinesCache[machine._id] = machine;
                setTimeout(function(){
                    updateMachine(UpdateMachinesCache[machine._id]);
                    delete UpdateMachinesCache[machine._id];
                },2500)
            }
            else{
                UpdateMachinesCache[machine._id] = machine;
            }

        });

        Ext.socket.on('AddMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.addToStore(store,machine);
        });

        Ext.socket.on('AddActionTags',function(actionTag){
            var store = Ext.data.StoreManager.lookup("ActionTags");
            me.addToStore(store,actionTag);
        });

        Ext.socket.on('DeleteActionTags',function(actionTag){
            var store = Ext.data.StoreManager.lookup("ActionTags");
            var record = store.findRecord("value",actionTag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddExecutionTags',function(tag){
            var store = Ext.data.StoreManager.lookup("ExecutionTags");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteExecutionTags',function(tag){
            var store = Ext.data.StoreManager.lookup("ExecutionTags");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddMachineTags',function(tag){
            var store = Ext.data.StoreManager.lookup("MachineTags");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteMachineTags',function(tag){
            var store = Ext.data.StoreManager.lookup("MachineTags");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddMachineRoles',function(tag){
            var store = Ext.data.StoreManager.lookup("MachineRoles");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteMachineRoles',function(tag){
            var store = Ext.data.StoreManager.lookup("MachineRoles");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddTestCaseTags',function(tag){
            var store = Ext.data.StoreManager.lookup("TestCaseTags");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteTestCaseTags',function(tag){
            var store = Ext.data.StoreManager.lookup("TestCaseTags");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddUserTags',function(tag){
            var store = Ext.data.StoreManager.lookup("UserTags");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteUserTags',function(tag){
            var store = Ext.data.StoreManager.lookup("UserTags");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('AddVariableTags',function(tag){
            var store = Ext.data.StoreManager.lookup("VariableTags");
            me.addToStore(store,tag);
        });

        Ext.socket.on('DeleteVariableTags',function(tag){
            var store = Ext.data.StoreManager.lookup("VariableTags");
            var record = store.findRecord("value",tag.value);
            if(record) store.remove(record);
            store.removed = [];
        });

        Ext.socket.on('DeleteMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.removeFromStore(store,machine);
        });

        Ext.socket.on('UpdateActions',function(action){
            var store = Ext.data.StoreManager.lookup("Actions");
            me.updateStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsCombo");
            me.updateStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsTree");
            store.updateActions([action]);
        });

        Ext.socket.on('AddActions',function(action){
            var store = Ext.data.StoreManager.lookup("Actions");
            me.addToStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsCombo");
            me.addToStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsTree");
            store.addActions([action]);
        });

        Ext.socket.on('DeleteActions',function(action){
            var store = Ext.data.StoreManager.lookup("Actions");
            me.removeFromStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsCombo");
            me.removeFromStore(store,action);
            store = Ext.data.StoreManager.lookup("ActionsTree");
            store.deleteActions([action]);
        });

        Ext.socket.on('UpdateTestCases',function(testCase){
            var store = Ext.data.StoreManager.lookup("TestCases");
            me.updateStore(store,testCase);
            store = Ext.data.StoreManager.lookup("TestCaseTree");
            store.update([testCase]);
        });

        Ext.socket.on('AddTestCases',function(testCase){
            var store = Ext.data.StoreManager.lookup("TestCases");
            me.addToStore(store,testCase);
            store = Ext.data.StoreManager.lookup("TestCaseTree");
            store.add([testCase]);
        });

        Ext.socket.on('DeleteTestCases',function(testCase){
            var store = Ext.data.StoreManager.lookup("TestCases");
            me.removeFromStore(store,testCase);
            store = Ext.data.StoreManager.lookup("TestCaseTree");
            store.delete([testCase]);
        });

        Ext.socket.on('UpdateUsers',function(testCase){
            var store = Ext.data.StoreManager.lookup("Users");
            me.updateStore(store,testCase);
        });

        Ext.socket.on('AddUsers',function(testCase){
            var store = Ext.data.StoreManager.lookup("Users");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteUsers',function(action){
            var store = Ext.data.StoreManager.lookup("Users");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('UpdateTemplates',function(testCase){
            var store = Ext.data.StoreManager.lookup("Templates");
            me.updateStore(store,testCase);
        });

        Ext.socket.on('AddTemplates',function(testCase){
            var store = Ext.data.StoreManager.lookup("Templates");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteTemplates',function(action){
            var store = Ext.data.StoreManager.lookup("Templates");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('UpdateHosts',function(testCase){
            var store = Ext.data.StoreManager.lookup("Hosts");
            me.updateStore(store,testCase);
        });

        Ext.socket.on('AddHosts',function(testCase){
            var store = Ext.data.StoreManager.lookup("Hosts");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteHosts',function(action){
            var store = Ext.data.StoreManager.lookup("Hosts");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('UpdateTestSets',function(set){
            var store = Ext.data.StoreManager.lookup("TestSets");
            me.updateStore(store,set);
        });

        Ext.socket.on('AddTestSets',function(set){
            var store = Ext.data.StoreManager.lookup("TestSets");
            me.addToStore(store,set);
        });

        Ext.socket.on('DeleteTestSets',function(set){
            var store = Ext.data.StoreManager.lookup("TestSets");
            me.removeFromStore(store,set);
        });

        Ext.socket.on('FinishExecution',function(execution){
            var notification = Ext.create('widget.uxNotification', {
                title: 'Execution Notification',
                position: 'br',
                manager: 'mainViewport',
                //iconCls: 'ux-notification-icon-information',
                autoCloseDelay: 9000,
                spacing: 20,
                html: 'Entering from the component\'s br corner. 3000 milliseconds autoCloseDelay.<br />Increasd spacing.'
            });

            if((execution.status == "Ready To Run")&&(execution.user == Ext.util.Cookies.get('username'))){
                var failColor = "";
                var passColor = "";
                if (execution.failed != "0") failColor = "color:red";
                if (execution.passed != "0") passColor = "color:green";
                notification.html = "Execution: <b>"+execution.name + "</b> is done."+
                    '<div style="display:table;table-layout: fixed;">'+
                    '<div style="display:table-row;">'+
                    '<span style="display:table-cell;padding: 3px;">Passed:</span>'+
                    '<span style="display:table-cell;padding: 3px;'+passColor+'">'+execution.passed+'</span></div>'+
                    '<div style="display:table-row;">'+
                    '<span style="display:table-cell;padding: 3px;">Failed:</span>'+
                    '<span style="display:table-cell;padding: 3px;'+failColor+'">'+execution.failed+'</span></div></div>';
                notification.show();
            }

        });

        var UpdateExecutionsCache = {};
        Ext.socket.on('UpdateExecutions',function(execution){

            var updateExecution = function(execution){
                var store = Ext.data.StoreManager.lookup("Executions");
                me.updateStore(store,execution);
                var controller = Redwood.app.getController("Executions");
                var foundTab = controller.tabPanel.down("#"+execution._id);

                if (foundTab){
                    foundTab.updateTotals(execution);
                    foundTab.updateCloudStatus(execution);
                }
            };

            if(!UpdateExecutionsCache[execution._id]){
                UpdateExecutionsCache[execution._id] = execution;
                setTimeout(function(){
                    updateExecution(UpdateExecutionsCache[execution._id]);
                    delete UpdateExecutionsCache[execution._id];
                },2000)
            }
            else{
                UpdateExecutionsCache[execution._id] = execution;
            }

        });

        Ext.socket.on('AddExecutions',function(testCase){
            var store = Ext.data.StoreManager.lookup("Executions");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteExecutions',function(execution){
            var store = Ext.data.StoreManager.lookup("Executions");
            me.removeFromStore(store,execution);
        });

        Ext.socket.on('UpdateVariables',function(execution){
            var store = Ext.data.StoreManager.lookup("Variables");
            me.updateStore(store,execution);
        });

        Ext.socket.on('AddVariables',function(variable){
            var store = Ext.data.StoreManager.lookup("Variables");
            if(!store.query("name",variable.name )){
                me.addToStore(store,variable);
            }
        });

        Ext.socket.on('DeleteVariables',function(action){
            var store = Ext.data.StoreManager.lookup("Variables");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('AddExecutionLog',function(logs){
            var controller = Redwood.app.getController("Executions");
            logs.forEach(function(log){
                var foundTab = controller.tabPanel.down("#"+log.resultID);
                if (foundTab){
                    foundTab.logStore.add(log);
                }
            });
        });

        var UpdateExecutionTestCaseCache = {};

        Ext.socket.on('UpdateExecutionTestCase',function(testCase){
            var update = function(testCase){
                var foundTab = null;
                var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
                if (store == null) return;
                var controller = Redwood.app.getController("Executions");
                var record = null;

                if (testCase.baseState == true){
                    foundTab = controller.tabPanel.down("#"+testCase.executionID);
                    if (foundTab){
                        //record = foundTab.down("#executionMachines").store.findRecord("baseStateTCID",testCase._id);
                        record = foundTab.down("#executionMachines").store.query("baseStateTCID",testCase._id).getAt(0);
                        record.set("result",testCase.result);
                        record.set("resultID",testCase.resultID);
                        //foundTab.refreshResult(result);
                    }
                }
                else{
                    record = store.query("_id",testCase._id).getAt(0);

                    for(var propt in testCase){
                        if ((propt != "_id")&&(propt != "name")&&(propt != "tcData")){
                            record.set(propt.toString(),Ext.util.Format.htmlEncode(testCase[propt]));
                        }
                    }
                    store.fireEvent("beforesync",{update:[record]});
                }
            };

            if(!UpdateExecutionTestCaseCache[testCase._id]){
                UpdateExecutionTestCaseCache[testCase._id] = testCase;
                setTimeout(function(){
                    update(UpdateExecutionTestCaseCache[testCase._id]);
                    delete UpdateExecutionTestCaseCache[testCase._id];
                },7000)
            }
            else{
                UpdateExecutionTestCaseCache[testCase._id] = testCase;
            }
        });

        Ext.socket.on('RemoveExecutionTestCase',function(testCase){
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;

            if (testCase instanceof Array){
                testCase.forEach(function(item){
                    me.removeFromStore(store,item);
                });
            }
            else{
                me.removeFromStore(store,testCase);
            }
        });

        Ext.socket.on('AddExecutionTestCase',function(testCase){
            var addToStore = function(testcase,tcStore){
                if(testcase.tcData && testcase.tcData.length != ""){
                    if (tcStore.findBy(function(record){if(record.get("testcaseID") == testcase.testcaseID && record.get("rowIndex") == testcase.rowIndex)return true}) == -1){
                        tcStore.add(testcase);
                    }
                }
                else if (tcStore.find("testcaseID",testcase.testcaseID) == -1){
                    var originalTC = Ext.data.StoreManager.lookup('TestCases').query("_id",testcase.testcaseID).getAt(0);
                    if (originalTC){
                        testcase.name = originalTC.get("name");
                        testcase.tag = originalTC.get("tag");
                        tcStore.add(testcase);
                    }
                }
            };
            var store;
            if (testCase instanceof Array){
                store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase[0].executionID);
                if (store == null) return;
                testCase.forEach(function(item){
                    addToStore(item,store);
                });
            }
            else{
                store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
                if (store == null) return;
                addToStore(testCase,store);
            }
        });
    },

    updateStore: function(store,item){
        if(item){
            //var record = store.findRecord("_id", item._id);
            var record = store.query("_id",item._id);
            if(record.length == 0) return;
            for(var propt in item){
                if (propt != "_id"){
                    record.getAt(0).set(propt,item[propt]);
                }
            }
            store.fireEvent("beforesync",{update:[record.getAt(0)]});
            record.getAt(0).dirty = false;
        }
    },

    removeFromStore: function(store,item){
        //var record = store.findRecord("_id",item.id);
        //if (record == null) return;
        var record = store.query("_id",item.id);
        if(record.length == 0) return;
        store.remove(record.getAt(0));
        store.fireEvent("beforesync",{destroy:[record.getAt(0)]});
        store.removed = [];
    },

    addToStore: function(store,item){
        //if (store.find("_id",item._id) == -1){
        if (store.query("_id",item._id).length == 0){
            if(item.project && item.project != Ext.util.Cookies.get("project")){
                return;
            }
            else{
                    var items = store.add(item);
                    store.fireEvent("beforesync",{create:items});
                    items[0].phantom = false;
            }
        }
    }



});