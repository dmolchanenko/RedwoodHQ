Ext.define("Redwood.controller.RealTimeEvents", {
    extend: 'Ext.app.Controller',

    init: function () {

        //Ext.ComponentQuery.query('variablesEditor')[0];
        //Ext.socket.emit('terminal', "newTerminalSession");
    },

    startEvents: function(){
        var me = this;
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

        Ext.socket.on('UpdateResult',function(result){
            var controller = Redwood.app.getController("Executions");
            var foundTab = controller.tabPanel.down("#"+result._id);
            if (foundTab){
                foundTab.refreshResult(result);
            }
        });

        Ext.socket.on('UpdateMachines',function(machine){
            var store = Ext.data.StoreManager.lookup("Machines");
            me.updateStore(store,machine);
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

        Ext.socket.on('UpdateExecutions',function(execution){
            var store = Ext.data.StoreManager.lookup("Executions");
            me.updateStore(store,execution);
        });

        Ext.socket.on('AddExecutions',function(testCase){
            var store = Ext.data.StoreManager.lookup("Executions");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteExecutions',function(action){
            var store = Ext.data.StoreManager.lookup("Executions");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('UpdateVariables',function(execution){
            var store = Ext.data.StoreManager.lookup("Variables");
            me.updateStore(store,execution);
        });

        Ext.socket.on('AddVariables',function(testCase){
            var store = Ext.data.StoreManager.lookup("Variables");
            me.addToStore(store,testCase);
        });

        Ext.socket.on('DeleteVariables',function(action){
            var store = Ext.data.StoreManager.lookup("Variables");
            me.removeFromStore(store,action);
        });

        Ext.socket.on('AddExecutionLog',function(log){
            var controller = Redwood.app.getController("Executions");
            var foundTab = controller.tabPanel.down("#"+log.resultID);
            if (foundTab){
                foundTab.logStore.add(log);
            }
        });

        Ext.socket.on('UpdateExecutionTestCase',function(testCase){
            var foundTab = null;
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;
            var controller = Redwood.app.getController("Executions");
            var record = null;

            if (testCase.baseState == true){
                foundTab = controller.tabPanel.down("#"+testCase.executionID);
                if (foundTab){
                    record = foundTab.down("#executionMachines").store.findRecord("baseStateTCID",testCase._id);
                    record.set("result",testCase.result);
                    record.set("resultID",testCase.resultID);
                    //foundTab.refreshResult(result);
                }
            }
            else{
                foundTab = controller.tabPanel.down("#"+testCase.executionID);
                record = store.findRecord("_id",testCase._id);

                if (foundTab){
                    if(!record) return;

                    if(record.get("status") != testCase.status){
                        if(testCase.status == "Finished"){
                            if(testCase.result == "Passed"){
                                foundTab.updateTotals({notRun:-1,passed:1});
                            }
                            else{
                                foundTab.updateTotals({notRun:-1,failed:1});
                            }
                        }
                        else if(record.get("status") == "Finished"){
                            if(record.get("result") == "Passed"){
                                foundTab.updateTotals({passed:-1,notRun:1});
                            }
                            else{
                                foundTab.updateTotals({failed:-1,notRun:1});
                            }
                        }
                    }
                }

                for(var propt in testCase){
                    if ((propt != "_id")&&(propt != "name")){
                        record.set(propt,testCase[propt]);
                    }
                }
                //record.set(name)
                store.fireEvent("beforesync",{update:[record]});
            }
        });

        Ext.socket.on('RemoveExecutionTestCase',function(testCase){
            var store = Ext.data.StoreManager.lookup("ExecutionTCs"+testCase.executionID);
            if (store == null) return;
            var controller = Redwood.app.getController("Executions");


            var removeTC = function(test){
                var record = store.findRecord("_id",test.id);
                if(!record)return;

                var foundTab = controller.tabPanel.down("#"+testCase.executionID);
                if (foundTab){
                    if(record.get("status") == "Finished"){
                        if(testCase.result == "Passed"){
                            foundTab.updateTotals({total:-1,passed:-1});
                        }
                        else{
                            foundTab.updateTotals({total:-1,failed:-1});
                        }
                    }
                    else{
                        foundTab.updateTotals({total:-1,notRun:-1});
                    }

                }
                store.remove(record);
                store.fireEvent("beforesync",{destroy:[record]});
            };

            if (testCase instanceof Array){
                testCase.forEach(function(item){
                    me.removeFromStore(store,item);
                    removeTC(item);
                });
            }
            else{
                removeTC(testCase);
            }
        });

        Ext.socket.on('AddExecutionTestCase',function(testCase){
            var controller = Redwood.app.getController("Executions");

            var addToStore = function(testcase,tcStore){
                if (tcStore.find("testcaseID",testcase.testcaseID) == -1){
                    var foundTab = controller.tabPanel.down("#"+testcase.executionID);
                    if (foundTab){
                        foundTab.updateTotals({total:1,notRun:1});
                    }
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
        var record = store.findRecord("_id", item._id);
        if(!record) return;
        for(var propt in item){
            if (propt != "_id"){
                record.set(propt,item[propt]);
            }
        }
        store.fireEvent("beforesync",{update:[record]});
        record.dirty = false;
    },

    removeFromStore: function(store,item){
        var record = store.findRecord("_id",item.id);
        store.remove(record);
        store.fireEvent("beforesync",{destroy:[record]});
        store.removed = [];
    },

    addToStore: function(store,item){
        if (store.find("_id",item._id) == -1){
            var items = store.add(item);
            store.fireEvent("beforesync",{create:items});
            items[0].phantom = false;
        }
    }



});