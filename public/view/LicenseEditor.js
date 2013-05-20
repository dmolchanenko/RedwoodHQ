Ext.define('Redwood.view.LicenseEditor', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.licenseEditor',
    overflowY: 'auto',
    bodyPadding: 10,

    items:[
        {
            xtype: "displayfield",
            fieldLabel: "Number of users licenced",
            labelStyle: "font-weight: bold",
            style:"font-weight: bold",
            itemId:"numberOfUsers"
        },
        {
            xtype:"button",
            text: "Upload License File",
            handler: function(){

            }
        }

    ]
});