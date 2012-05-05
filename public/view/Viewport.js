Ext.define('Redwood.view.Viewport', {
    extend: 'Ext.container.Viewport',

    layout: 'fit',

    items: [{
        xtype: 'panel',
        title: 'Redwood Automation Framework',
        items: [{
            //xtype: 'variablesEditor'
            xtype: 'machinesEditor'
        }]
    }]
});