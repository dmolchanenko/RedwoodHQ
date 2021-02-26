Ext.define('Redwood.view.RecorderView', {
    extend: 'Ext.window.Window',
    alias: 'widget.recorderview',

    title: 'Start Recording',
    height: 250,
    width: 450,
    modal: true,
    resizable: true,
    layout: 'fit',
    listeners:{
        afterrender : function(me) {
            me.down("#url").focus();
            //me.down("#noteText").setValue(me.value);
        }
    },

    initComponent: function () {
        var me = this;
        this.items = {
            xtype:"form",
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            layout:"anchor",
            defaultFocus: "url",
            bodyPadding: 5,
            border: false,
            defaults: {
                //anchor: '100% 100%',
                //flex: 1,
                //layout: 'fit',
                anchor: '100%',
                bodyPadding: 5
            },
            items: [{
                xtype: "textfield",
                allowBlank: false,
                //margin: "0 0 7 0",
                itemId:"url",
                name:"url",
                //activeItem:0,
                //height: 180,
                //anchor:'90% 90%',
                //value:me.value,
                fieldLabel: 'URL',
                enableAlignments: false,
                listeners:{
                    initialize : function(editor) {
                        editor.setActive();
                        editor.focus();
                    }
                }
            },
                {
                    xtype:'combo',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'Browser',
                    store: ["Firefox","Chrome","IE"],
                    name: 'browser',
                    itemId:'browser',
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    value:"Firefox",
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                            }
                        }
                    }
                }],

            buttons: [
                {
                    xtype: "button",
                    text: "OK",
                    itemId: "SubmitForm",
                    handler: function(btn){
                        //me.onNoteSave(btn.up("form").down("#noteText").getValue());
                        Ext.Ajax.request({
                            url:"/record",
                            method:"POST",
                            jsonData : {type:"testcase",url:me.down("#url").getValue(),browser:me.down("#browser").getValue()},
                            success: function(response) {
                                //Ext.MessageBox.hide();
                                //Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
                            }
                        });
                        this.up("window").close();
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