Ext.define('Redwood.view.EmailSettings', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.emailSettings',
    bodyPadding: 10,
    minHeight: 150,
    manageHeight: true,
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',

    initComponent: function () {

        var me = this;

        this.items = [
            {
                xtype: 'form',
                //title: 'Email Settings',
                defaultType: 'textfield',
                layout:"anchor",
                bodyPadding: 5,
                buttonAlign:"left",
                width: 460,
                defaults: {
                    width: 450
                },
                items: [
                    {
                        xtype: "textfield",
                        fieldLabel: "Server Host",
                        afterLabelTextTpl: me.requiredText,
                        name: "serverHost",
                        itemId: "serverHost",
                        emptyText: "Host name that is used in the URL",
                        allowBlank:false
                    },                    {
                        xtype: "textfield",
                        fieldLabel: "SMTP Host",
                        afterLabelTextTpl: me.requiredText,
                        name: "host",
                        itemId: "host",
                        allowBlank:false
                    },
                    {
                        xtype:'combo',
                        fieldLabel: 'Protocol',
                        store: ["SMTP","SMTPS"],
                        name: 'protocol',
                        itemId: 'protocol',
                        forceSelection: true,
                        editable: false,
                        value:"SMTP"
                    },
                    {
                        xtype: "textfield",
                        fieldLabel: "SMTP Port",
                        maskRe: /[0-9.]/,
                        name: "port",
                        itemId: "port",
                        emptyText: "Default is 25 for SMTP and 465 for SMTPS"
                    },
                    {
                        xtype: "textfield",
                        fieldLabel: "User Name",
                        name: "user",
                        itemId: "user",
                        emptyText: "Optional- needed only if authentication is required."
                    },
                    {
                        xtype: "textfield",
                        fieldLabel: "Password",
                        name: "password",
                        itemId: "password",
                        inputType: 'password',
                        emptyText: "Optional- needed only if authentication is required."
                    }
                ],
                buttons:[
                    {
                        text: 'Save Settings',
                        itemId: "submit",
                        formBind: true,
                        handler: function(){
                            me.fireEvent("setEmailSettings",me.down("form").form.getFieldValues())
                        }
                    }
                ]
            }

        ];

        this.callParent(arguments);
    },
    loadData: function(data){
        this.down("#host").setValue(data.host);
        this.down("#serverHost").setValue(data.serverHost);
        this.down("#protocol").setValue(data.protocol);
        this.down("#port").setValue(data.port);
        this.down("#user").setValue(data.user);
        this.down("#password").setValue(data.password);
    }
});