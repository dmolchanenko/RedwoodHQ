Ext.application({
//var APP =  newExt.app.Application({

    name: "Redwood",
    appFolder: ".",
    autoCreateViewport: true,

    controllers: [
        'Machines','Variables','Users','Scripts','Actions','Projects','RealTimeEvents','TestCases','TestSets','Executions','License'],
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
        Ext.tip.QuickTipManager.init();
        Ext.socket = io.connect('http://'+ document.location.host);

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