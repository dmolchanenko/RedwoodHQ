Ext.define('Redwood.view.SSHKeyView', {
    extend: 'Ext.window.Window',
    alias: 'widget.sshkeyview',

    title: 'SSH Key',
    path: "",
    //height: 200,
    width: 400,
    modal: true,
    resizable: true,
    layout: 'anchor',
    defaultFocus: "sshKey",
    //callback if file name was submitted to the server
    fn:function(result){},
    listeners: {
        afterrender: function(window){
            Ext.Ajax.request({
                url:"/users/sshkey",
                method:"GET",
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', obj.error);
                    }
                    else{
                        window.down("#sshKey").setValue(obj.sshKey);
                    }
                }
            });
        }
    },

    initComponent: function () {
        var me = this;

        this.items = {
            xtype:"form",
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            //layout:"fit",
            bodyPadding: 5,
            border: false,
            defaults: {
                anchor: '100%'
            },
            items: [{
                xtype: "textarea",
                name: "sshKey",
                rows      : 9,
                readOnly: true,
                fieldLabel: "SSH Key",
                labelAlign: "top",
                itemId: "sshKey",
                allowBlank:false,
                listeners:{
                    specialkey: function(field, e){
                        if (e.getKey() == e.ENTER) {
                            var btn = this.up("form").down("button");
                            btn.handler.call(btn.scope, btn, Ext.EventObject);
                        }
                    },
                    afterrender: function(field){
                        field.focus();
                    }
                }
            }

            ],

            buttons: [
                {
                    xtype: "button",
                    text: "Enable Remote Repo",
                    itemId: "SubmitForm",
                    handler: function(me){
                        me.setDisabled(true);
                        var form = me.up('form').getForm();
                        var window = me.up('window');
                        //var store = window.store;
                        if (form.isValid()) {
                            Ext.Ajax.request({
                                url:"/users/sshkey",
                                method:"POST",
                                jsonData : {sshKey:form.getFieldValues().sshKey},
                                success: function(response, action) {
                                    var obj = Ext.decode(response.responseText);
                                    if(obj.error != ""){
                                        Ext.Msg.alert('Error', obj.error);
                                        me.setDisabled(false);
                                    }
                                    else{
                                        Ext.Msg.alert('Success', "Remote Repo Enabled.",function(){
                                            window.close();
                                        });
                                    }
                                }
                            });
                        }
                        else{
                            me.setDisabled(false);
                        }
                    }
                },{
                    xtype: "button",
                    text: "Cancel",
                    handler: function(){
                        this.up("window").close();
                    }
                }
            ]
        };
        this.callParent(arguments);
    }
});