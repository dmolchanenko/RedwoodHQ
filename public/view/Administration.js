var adminStore = Ext.create('Ext.data.TreeStore', {
    root: {
        expanded: true,
        children: [
            { text: "Variables", leaf: true },
            { text: "Machines", leaf: true },
            { text: "Users", leaf: true },
            { text: "Projects", leaf: true }
        ]
    }
});

Ext.define('Redwood.view.Administration', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.administration',

    title:"Administration",
    layout: 'fit',

    items:[
        {
            region: 'west',
            split:true,
            xtype: 'treepanel',
            collapseDirection: "left",
            collapsible: true,
            multiSelect: false,
            rootVisible: false,
            store: adminStore,
            width: 150,
            focused: true
        }
        //Ext.create('Redwood.view.Variables',{region:"center"})

    ]




});