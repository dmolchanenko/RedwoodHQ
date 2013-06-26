Ext.define('Redwood.view.LicenseEditor', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.licenseEditor',
    //region:"center",
    //layout: "accordion",
    //overflowY: 'auto',
    //layout: 'border',
    bodyPadding: 10,
    minHeight: 150,
    manageHeight: true,
    //region:"center",
    //layout: "fit",


    initComponent: function () {

        var me = this;

        this.items = [
            {
                xtype: 'fieldset',
                title: 'License Information',
                defaultType: 'textfield',
                itemId:"testcaseDetails",
                flex: 1,
                collapsible: false,
                defaults: {
                    flex: 1
                },
                items: [
                    {
                        xtype: "displayfield",
                        shrinkWrap:0,
                        fieldLabel: "Number of users licenced",
                        labelStyle: "font-weight: bold",
                        style:"font-weight: bold",
                        labelWidth: 160,
                        flex: 1,
                        value: "1",
                        margin: "0 0 15 0",
                        itemId:"numberOfUsers"
                    },
                    {
                        xtype: "textarea",
                        height: 260,
                        width: 450,
                        margin: "0 0 7 0",
                        itemId: "licenseText"

                    },
                    {
                        xtype:"button",
                        text: "Set New License",
                        handler: function(){
                            me.fireEvent("setLicense",me.down("#licenseText").getValue())
                        }
                    }
                    ]
            }

        ];

        this.callParent(arguments);
    }
});