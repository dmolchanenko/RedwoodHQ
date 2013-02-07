Ext.define('Redwood.view.ScriptViewer', {
    extend: 'Ext.window.Window',
    alias: 'widget.scriptViewer',
    width: 400,
    height: 300,
    layout: 'fit',
    draggable: true,
    resizable: true,
    modal: true,
    title: 'Select Script',

    initComponent: function () {
        var me = this;
        this.items=[
            {
                xtype: "panel",
                layout: "anchor",
                items:[
                    {
                        xtype: 'treepanel',
                        multiSelect: false,
                        rootVisible: false,
                        height: 235,
                        store:  Ext.create('Redwood.store.MethodFinder'),
                        focused: false,
                        viewConfig: {
                            markDirty: false,
                            stripeRows: true
                        },
                        listeners:{
                            selectionchange: function(tree,record){
                                if (record[0].get("type") == "method"){
                                    me.down("#OK").setDisabled(false);
                                }
                                else{
                                    me.down("#OK").setDisabled(true);
                                }
                            }
                        }
                    },
                    {
                        xtype:"panel",
                        layout: {
                            type: 'hbox',
                            align: 'spaced',
                            pack: "center",
                            defaultMargins: {right:15}
                        },
                        items:[
                            {
                                xtype:"button",
                                itemId: "OK",
                                text: "OK",
                                disabled: true,
                                handler: function(){
                                    me.fireEvent("methodselected",me.down("treepanel").getSelectionModel().getSelection()[0]);
                                    me.close();
                                }
                            },
                            {
                                xtype:"button",
                                text: "Cancel",
                                handler: function(){
                                    me.close();
                                }
                            }
                        ]
                    }
                ]
            }

        ];
        this.callParent(arguments);
    },
    listeners:{
        afterrender: function(me){
        }
    }




});


Ext.define('Redwood.view.ScriptPicker', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.scriptPicker',

    trigger1Cls: Ext.baseCSSPrefix + 'form-search-trigger',
    //trigger2Cls: Ext.baseCSSPrefix + 'form-goto-trigger',
    fieldLabel: "Select Script",
    editable: true,

    openScriptViewer: function(){
        var me = this;
        var scripts = new Redwood.view.ScriptViewer();
        scripts.on("methodselected",function(record){
            var method = record.get("fullpath");
            method = method.substring(method.lastIndexOf("/")+1,method.length);
            //method = method.split("src/")[1];
            method = method.substring(0,method.length - 7);
            me.setValue(method);
        });
        scripts.show();
    },

    onTrigger1Click: function() {
        this.openScriptViewer();
    },

    listeners:{
        afterrender: function(me){
            //me.inputEl.dom.onclick = function(){
            //    me.openScriptViewer();
            //}
        }
    }

});

