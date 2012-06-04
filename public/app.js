Ext.application({

    name: "Redwood",
    appFolder: ".",

    autoCreateViewport: true,

    controllers: [
        'Machines','Variables','Users','Scripts'
    ]
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