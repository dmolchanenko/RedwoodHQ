Ext.application({
//var APP =  newExt.app.Application({

    name: "Redwood",
    appFolder: ".",
    autoCreateViewport: true,

    controllers: [
        'Machines','Variables','Users','Scripts','Actions'
    ],
    launch: function(){
        Ext.tip.QuickTipManager.init();
        Ext.socket = io.connect('http://'+ document.location.host);
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