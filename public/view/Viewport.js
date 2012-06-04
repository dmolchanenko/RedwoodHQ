Ext.define('Redwood.view.Viewport', {
    extend: 'Ext.container.Viewport',

    layout: 'fit',
    style: {height:"100%"},
    items: [{
        xtype: 'panel',
        title: 'Redwood Automation Framework',
        items: [{
            //xtype: 'variablesEditor'
            //xtype: 'machinesEditor'
            //xtype: 'usersEditor'
            xtype: 'scriptBrowser'
        }]
    }]
});