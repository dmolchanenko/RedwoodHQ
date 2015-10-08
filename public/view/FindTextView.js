Ext.define('Redwood.view.FindTextView', {
    extend: 'Ext.window.Window',
    alias: 'widget.findtextview',

    title: 'Find in Path',
    path: "",
    //height: 200,
    width: 300,
    modal: true,
    resizable: true,
    layout: 'anchor',
    defaultFocus: "textToFind",
    //callback if file name was submitted to the server
    fn:function(result){},

    initComponent: function () {
        var path = this.path;
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
                xtype: "textfield",
                name: "textToFind",
                fieldLabel: "Text to Find",
                labelAlign: "top",
                itemId: "textToFind",
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
                },
                {
                    xtype: "checkbox",
                    name: "regExp",
                    fieldLabel: "Reg Exp",
                    //labelAlign: "left",
                    labelWidth: 80,
                    itemId:"regExp"
                },
                {
                    xtype: "checkbox",
                    name: "case",
                    fieldLabel: "Case sensitive",
                    //labelAlign: "left",
                    labelWidth: 80,
                    itemId:"case"
                }
            ],

            buttons: [
                {
                    xtype: "button",
                    text: "OK",
                    itemId: "SubmitForm",
                    handler: function(me){
                        me.setDisabled(true);
                        var form = me.up('form').getForm();
                        var window = me.up('window');
                        //var store = window.store;
                        if (form.isValid()) {
                            Ext.Ajax.request({
                                url:"/scripts/findtext",
                                method:"POST",
                                jsonData : {text:form.getFieldValues().textToFind,case:form.getFieldValues().case,regExp:form.getFieldValues().regExp,fullPath:window.path},
                                success: function(response, action) {
                                    var obj = Ext.decode(response.responseText);
                                    if(obj.error == null){
                                        var controller = Redwood.app.getController("Scripts");
                                        controller.onFindTextResults(obj.foundResults);
                                        window.close();
                                    }
                                    else{
                                        Ext.Msg.alert('Error', obj.error);
                                        me.setDisabled(false);
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
        if (this.objectType == "folder"){
            this.down("#fileName").fieldLabel = "Please Enter Folder Name"
        }
    }
});