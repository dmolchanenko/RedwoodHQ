Ext.application({
//var APP =  newExt.app.Application({

    name: "Redwood",
    appFolder: ".",
    autoCreateViewport: true,

    controllers: [
        'Machines','Variables','Users','Scripts','Actions','Projects','RealTimeEvents','TestCases','TestSets','Executions','License','EmailSettings'],
    launch: function(){
        Redwood.app = this;
        Ext.clipboard = {};
        Ext.uniqueId = function()
        {
            var newDate = new Date;
            var partOne = newDate.getTime();
            var partTwo = 1 + Math.floor((Math.random()*32767));
            var partThree = 1 + Math.floor((Math.random()*32767));
            var id = partOne + '-' + partTwo + '-' + partThree;
            return id;
        };
        Ext.arraysEqual = function(a,b){
            if (a.length != b.length) {
                return false;
            }

            for (var i=0; i<a.length; i++) {
                if (a[i] != b[i]) {
                    return false;
                }
            }

            return true;
        };
        Ext.tip.QuickTipManager.init();
        Ext.socket = io.connect('http://'+ document.location.host,{'reconnection delay': 5000});

        Ext.socket.on("reconnecting",function(data){
            Ext.MessageBox.show({
                msg: 'Connection to server lost, attempting to reconnect...',
                progressText: 'Connecting...',
                width:300,
                wait:true,
                waitConfig: {interval:200}
            });
        });
        Ext.socket.on('connect', function(){if (Ext.MessageBox.isVisible()) Ext.MessageBox.hide();});

        this.getController("RealTimeEvents").startEvents();
        var uri = Ext.Object.fromQueryString(location.search);

        var mainTab = Ext.ComponentQuery.query('#mainTabPanel')[0];
        var event;
        if(uri.project){
            if (Ext.util.Cookies.get('project') != uri.project){
                Ext.util.Cookies.set('project',uri.project);
                window.location.reload(true);
            }
        }
        if(uri.testcase){
            mainTab.setActiveTab(mainTab.down("#testcasesBrowser"));
            event = Ext.data.StoreManager.lookup('TestCases').on("load",function(store){
                var record = store.findRecord("_id",uri.testcase);
                if(record != null){
                    Redwood.app.getController("TestCases").onEditTestCase(record);
                    store.un(event);
                }
            });
        }
        else if(uri.action){
            mainTab.setActiveTab(mainTab.down("#actionsBrowser"));
            event = Ext.data.StoreManager.lookup('Actions').on("load",function(store){
                var record = store.findRecord("_id",uri.action);
                if(record != null){
                    Redwood.app.getController("Actions").onEditAction(record);
                    store.un(event);
                }
            });
        }
        else if(uri.execution){
            mainTab.setActiveTab(mainTab.down("#executionsBrowser"));
            event = Ext.data.StoreManager.lookup('Executions').on("load",function(store){
                var record = store.findRecord("_id",uri.execution);
                if(record != null){
                    Redwood.app.getController("Executions").onExecutionEdit(uri.execution);
                    store.un(event);
                }
            });
        }else if(uri.result){
            mainTab.setActiveTab(mainTab.down("#executionsBrowser"));
            Redwood.app.getController("Executions").openExecutionDetails(uri.result);
        }else if(uri.aggregate){
            mainTab.setActiveTab(mainTab.down("#executionsBrowser"));
            event = Ext.data.StoreManager.lookup('Executions').on("load",function(store){
                Redwood.app.getController("Executions").aggregateReport(uri.aggregate.split(","));
                store.un(event);
            });
        }else if(uri.script){
            mainTab.setActiveTab(mainTab.down("#ScriptBrowser"));
            event = Ext.data.StoreManager.lookup('Scripts').on("load",function(store){
                if(uri.line){
                    Redwood.app.getController("Scripts").onScriptEdit(uri.script,parseInt(uri.line)-1);
                }
                else{
                    Redwood.app.getController("Scripts").onScriptEdit(uri.script);
                }
                store.un(event);
            });
        }

        window.onbeforeunload = function(){
            console.log("SCRIPT");
            var allScripts = Ext.ComponentQuery.query('codeeditorpanel');

            for (var i=0;i<allScripts.length;i++){
                if (allScripts[i].dirty == true){
                    return "You have unsaved changes in one of your scripts.";
                }
            }

            var allActions = Ext.ComponentQuery.query('actionview');

            for (var i=0;i<allActions.length;i++){
                if (allActions[i].dirty == true){
                    return "You have unsaved changes in one of your actions.";
                }
            }

            var allTestCases = Ext.ComponentQuery.query('testcaseview');

            for (var i=0;i<allTestCases.length;i++){
                if (allTestCases[i].dirty == true){
                    return "You have unsaved changes in one of your test cases.";
                }
            }

            var allExecutions = Ext.ComponentQuery.query('executionview');

            for (var i=0;i<allExecutions.length;i++){
                if (allExecutions[i].dirty == true){
                    return "You have unsaved changes in one of your executions.";
                }
            }

            var allTestSets = Ext.ComponentQuery.query('testsetEdit');

            for (var i=0;i<allTestSets.length;i++){
                if (allTestSets[i].dirty == true){
                    return "You have unsaved changes in one of your test sets.";
                }
            }
        };
        //Ext.FocusManager.enable();
    }
});

/*
Ext.application({
    name: "Redwood",
    appFolder: "app",
    launch: function () {
        Ext.create('Ext.container.Viewport', {
            layout: 'fit',
            items: [{
                xtype: 'panel',
                title: 'Redwood Automation Framework',
                html: ''
            }]
        });
    }
});
    */