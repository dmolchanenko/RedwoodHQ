Ext.define('Redwood.view.TestCaseNote', {
    extend: 'Ext.window.Window',
    alias: 'widget.testcasenote',

    title: 'Note',
    height: 250,
    width: 450,
    modal: true,
    resizable: true,
    layout: 'fit',
    defaultFocus: "noteText",
    onNoteSave:null,
    value:"",
    listeners:{
        afterrender : function(me) {
            me.down("#noteText").focus();
            me.down("#noteText").setValue(me.value);
        }
    },

    initComponent: function () {
        var me = this;
        this.items = {
            xtype:"form",
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            layout:"fit",
            bodyPadding: 5,
            defaultFocus: "noteText",
            border: false,
            defaults: {
                anchor: '100% 100%',
                flex: 1,
                layout: 'fit',
                bodyPadding: 5
            },
                items: [{
                    xtype: "htmleditor",
                    allowBlank: true,
                    margin: "0 0 7 0",
                    itemId:"noteText",
                    name:"noteText",
                    activeItem:0,
                    //height: 180,
                    //anchor:'90% 90%',
                    value:me.value,
                    enableAlignments: false,
                    listeners:{
                        initialize : function(editor) {
                            editor.setActive();
                            editor.focus();
                        }
                    }
                }],

                buttons: [
                    {
                        xtype: "button",
                        text: "OK",
                        itemId: "SubmitForm",
                        handler: function(btn){
                            me.onNoteSave(btn.up("form").down("#noteText").getValue());
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